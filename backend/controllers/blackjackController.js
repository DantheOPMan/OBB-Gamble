const BlackjackHand = require('../models/blackjackHandModel');
const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');
const mongoose = require('mongoose');

const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const values = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];

const createDeck = () => {
    const deck = [];
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }
    return shuffleDeck(deck);
};

const shuffleDeck = (deck) => {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
};

const getCardValue = (card) => {
    if (['Jack', 'Queen', 'King'].includes(card.value)) {
        return 10;
    }
    if (card.value === 'Ace') {
        return 11;
    }
    return parseInt(card.value);
};

const calculateHandValue = (hand) => {
    let value = 0;
    let aceCount = 0;

    hand.forEach(card => {
        value += getCardValue(card);
        if (card.value === 'Ace') {
            aceCount += 1;
        }
    });

    while (value > 21 && aceCount > 0) {
        value -= 10;
        aceCount -= 1;
    }

    return value;
};

const verifyUserOwnership = (hand, userId) => {
    if (!hand.userId.equals(userId)) {
        throw new Error('You are not authorized to play this hand');
    }
};

const filterHandData = (hand) => {
    const handObj = hand.toObject();
    const filteredHand = {
        handId: handObj._id,
        playerHands: handObj.playerHands,
        dealerVisibleCards: handObj.dealerVisibleCards,
        status: handObj.status,
    };
    return filteredHand;
};

const determineHandOutcome = (playerHand, dealerValue) => {
    if (playerHand.value > 21) {
        return 'bust';
    }
    if (dealerValue > 21 || playerHand.value > dealerValue) {
        return 'player_wins';
    }
    if (playerHand.value < dealerValue) {
        return 'dealer_wins';
    }
    return 'tie';
};

const finishDealerTurn = async (hand, session) => {
    while (hand.dealerValue < 17) {
        const card = hand.deck.pop();
        hand.dealerHand.push(card);
        hand.dealerValue = calculateHandValue(hand.dealerHand);
    }

    hand.status = 'completed';
    hand.dealerVisibleCards = [...hand.dealerHand];
    await hand.save({ session });
};

const createHand = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    const { initialBPCharge } = req.body;
    if (typeof initialBPCharge !== 'number' || initialBPCharge <= 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Initial BP charge must be a positive number.' });
    }
    try {
        const userId = req.user._id;
        const existingHand = await BlackjackHand.findOne({ userId, status: 'ongoing' }).session(session);
        if (existingHand) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'You already have an ongoing hand. Resolve it before starting a new one.' });
        }

        const user = await User.findById(userId).session(session);
        if (user.bpBalance < initialBPCharge) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Insufficient BP balance to start a new hand.' });
        }

        // Deduct the initial BP charge from the user's balance
        user.bpBalance -= initialBPCharge;
        await user.save({ session });

        const deck = createDeck();
        const initialPlayerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];
        const playerValue = calculateHandValue(initialPlayerHand);
        const dealerValue = calculateHandValue(dealerHand);

        let status = 'ongoing';
        if (playerValue === 21 && dealerValue === 21) {
            status = 'tie';
        } else if (playerValue === 21) {
            status = 'player_blackjack';
        } else if (dealerValue === 21) {
            status = 'dealer_blackjack';
        }
        const newHand = new BlackjackHand({
            userId,
            deck,
            playerHands: [{
                cards: initialPlayerHand,
                value: playerValue,
                status: status === 'ongoing' ? 'ongoing' : status,
                bpCharged: initialBPCharge
            }],
            dealerHand,
            dealerValue,
            status,
            dealerVisibleCards: [dealerHand[0]],
        });

        if (status === 'player_blackjack') {
            const payout = initialBPCharge * 2.5;
            user.bpBalance += payout;
            newHand.playerHands[0].payout = payout;
            await user.save({ session });
        } else if (status === 'tie') {
            user.bpBalance += initialBPCharge;
            newHand.playerHands[0].payout = initialBPCharge;
            await user.save({ session });
        } else if (status === 'dealer_blackjack') {
            newHand.dealerVisibleCards = [dealerHand[0], dealerHand[1]];
        }

        await newHand.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json(filterHandData(newHand));

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: error.message });
    }
};

const hit = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { handId, handIndex } = req.params;
        const hand = await BlackjackHand.findById(handId).session(session);
        if (!hand || hand.status !== 'ongoing') {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Hand not found or game already finished' });
        }
        verifyUserOwnership(hand, req.user._id);

        // Ensure the player is interacting with the current hand
        if (handIndex > 0 && hand.playerHands[handIndex - 1].status === 'ongoing') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'You must complete the current hand before interacting with the next hand.' });
        }

        const card = hand.deck.pop();
        hand.playerHands[handIndex].cards.push(card);
        hand.playerHands[handIndex].value = calculateHandValue(hand.playerHands[handIndex].cards);

        // Check if the player hits 21 or busts
        if (hand.playerHands[handIndex].value >= 21) {
            if (hand.playerHands[handIndex].value === 21) {
                hand.playerHands[handIndex].status = 'stand';
            } else {
                hand.playerHands[handIndex].status = 'bust';
            }
        }

        // Save the hand and check if all hands are done
        await hand.save({ session });
        const allHandsStandOrBust = hand.playerHands.every(h => h.status !== 'ongoing');
        if (allHandsStandOrBust) {
            await finishDealerTurn(hand, session);
            const user = await User.findById(req.user._id).session(session);

            hand.playerHands.forEach(playerHand => {
                const outcome = determineHandOutcome(playerHand, hand.dealerValue);
                playerHand.status = outcome;

                if (outcome === 'player_wins') {
                    const payout = playerHand.bpCharged * 2;
                    user.bpBalance += payout;
                    playerHand.payout = payout;
                } else if (outcome === 'tie') {
                    const payout = playerHand.bpCharged;
                    user.bpBalance += payout;
                    playerHand.payout = payout;
                } else {
                    playerHand.payout = 0;
                }
            });

            await user.save({ session });
            await hand.save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json(filterHandData(hand));

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: error.message });
    }
};

const stand = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { handId, handIndex } = req.params;
        const hand = await BlackjackHand.findById(handId).session(session);
        if (!hand || hand.status !== 'ongoing') {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Hand not found or game already finished' });
        }
        verifyUserOwnership(hand, req.user._id);

        // Ensure the player is interacting with the current hand
        if (handIndex > 0 && hand.playerHands[handIndex - 1].status === 'ongoing') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'You must complete the current hand before interacting with the next hand.' });
        }

        hand.playerHands[handIndex].status = 'stand';

        const allHandsStandOrBust = hand.playerHands.every(h => h.status !== 'ongoing');
        if (allHandsStandOrBust) {
            await finishDealerTurn(hand, session);
            const user = await User.findById(req.user._id).session(session);
            hand.playerHands.forEach(playerHand => {

                const outcome = determineHandOutcome(playerHand, hand.dealerValue);
                playerHand.status = outcome;

                if (outcome === 'player_wins') {
                    const payout = playerHand.bpCharged * 2;
                    user.bpBalance += payout;
                    playerHand.payout = payout;
                } else if (outcome === 'tie') {
                    const payout = playerHand.bpCharged;
                    user.bpBalance += payout;
                    playerHand.payout = payout;
                } else {
                    playerHand.payout = 0;
                }
            });
            await user.save({ session });
        }
        await hand.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json(filterHandData(hand));

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: error.message });
    }
};

const doubleDown = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { handId, handIndex } = req.params;
        const hand = await BlackjackHand.findById(handId).session(session);
        if (!hand || hand.status !== 'ongoing') {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Hand not found or game already finished' });
        }
        verifyUserOwnership(hand, req.user._id);

        const user = await User.findById(req.user._id).session(session);
        const playerHand = hand.playerHands[handIndex];
        if (playerHand.cards.length !== 2) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Can only double down on a hand with exactly 2 cards.' });
        }

        const doubleBPCharge = playerHand.bpCharged;
        if (user.bpBalance < doubleBPCharge) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Insufficient BP balance to double down.' });
        }

        // Deduct the double BP charge from the user's balance
        user.bpBalance -= doubleBPCharge;
        await user.save({ session });

        const card = hand.deck.pop();
        playerHand.cards.push(card);
        playerHand.value = calculateHandValue(playerHand.cards);
        playerHand.status = 'double_down';
        playerHand.bpCharged += doubleBPCharge; // Update the BP charge for this hand

        // Check if the player busts
        if (playerHand.value > 21) {
            playerHand.status = 'bust';
        }

        await hand.save({ session });

        const allHandsStandOrBust = hand.playerHands.every(h => h.status !== 'ongoing');
        if (allHandsStandOrBust) {
            await finishDealerTurn(hand, session);
            const user = await User.findById(req.user._id).session(session);

            hand.playerHands.forEach(playerHand => {
                const outcome = determineHandOutcome(playerHand, hand.dealerValue);
                playerHand.status = outcome;

                if (outcome === 'player_wins') {
                    const payout = playerHand.bpCharged * 2;
                    user.bpBalance += payout;
                    playerHand.payout = payout;
                } else if (outcome === 'tie') {
                    const payout = playerHand.bpCharged;
                    user.bpBalance += payout;
                    playerHand.payout = payout;
                } else {
                    playerHand.payout = 0;
                }
            });

            await user.save({ session });
            await hand.save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json(filterHandData(hand));
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: error.message });
    }
};

const split = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { handId, handIndex } = req.params;
        const hand = await BlackjackHand.findById(handId).session(session);
        if (!hand || hand.status !== 'ongoing') {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Hand not found or game already finished' });
        }
        verifyUserOwnership(hand, req.user._id);

        const user = await User.findById(req.user._id).session(session);
        const playerHand = hand.playerHands[handIndex];

        // Check if the hand can be split
        const tenValues = ['10', 'Jack', 'Queen', 'King'];
        if (
            playerHand.cards.length !== 2 ||
            !(playerHand.cards[0].value === playerHand.cards[1].value ||
                (tenValues.includes(playerHand.cards[0].value) && tenValues.includes(playerHand.cards[1].value)))
        ) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Cannot split this hand' });
        }

        // Check if splitting will exceed the maximum number of hands (8)
        if (hand.playerHands.length >= 8) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Cannot split further, maximum number of hands reached.' });
        }

        const splitBPCharge = playerHand.bpCharged;
        if (user.bpBalance < splitBPCharge) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Insufficient BP balance to split the hand.' });
        }

        // Deduct the split BP charge for the new hand
        user.bpBalance -= splitBPCharge;
        await user.save({ session });

        const deck = hand.deck;

        const newHand1 = {
            cards: [playerHand.cards[0], deck.pop()],
            value: 0,
            status: 'ongoing',
            bpCharged: playerHand.bpCharged, // Set the BP charge same as the initial hand
        };
        newHand1.value = calculateHandValue(newHand1.cards);

        const newHand2 = {
            cards: [playerHand.cards[1], deck.pop()],
            value: 0,
            status: 'ongoing',
            bpCharged: playerHand.bpCharged, // Set the BP charge same as the initial hand
        };
        newHand2.value = calculateHandValue(newHand2.cards);

        hand.playerHands.splice(handIndex, 1, newHand1, newHand2);
        await hand.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json(filterHandData(hand));
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: error.message });
    }
};


const getCurrentHand = async (req, res) => {
    try {
        const userId = req.user._id;
        const hand = await BlackjackHand.findOne({ userId, status: 'ongoing' });
        if (!hand) {
            return res.status(404).json({ message: 'No ongoing hand found' });
        }
        res.status(200).json(filterHandData(hand));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const claimBlackjackProfits = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        // Get all completed Blackjack hands
        const hands = await BlackjackHand.find({ status: 'completed' }).session(session);
        const adminClaimHands = await BlackjackHand.find({ status: 'adminClaim' }).session(session);

        // Calculate total wagered and total returned
        const totalWagered = hands.reduce((sum, hand) =>
            sum + hand.playerHands.reduce((handSum, playerHand) => handSum + playerHand.bpCharged, 0), 0);
        const totalReturned = hands.reduce((sum, hand) => sum + hand.playerHands.reduce((handSum, playerHand) => handSum + playerHand.payout, 0), 0) +
            adminClaimHands.reduce((sum, hand) => sum + hand.playerHands.reduce((handSum, playerHand) => handSum + playerHand.payout, 0), 0);
        const netProfits = totalWagered - totalReturned;
        console.log(netProfits)

        if (netProfits <= 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'No profits to claim' });
        }

        // Calculate burn amount and net profits after burn
        const burnAmount = netProfits * 0.2;
        const netProfitsAfterBurn = netProfits - burnAmount;

        // Get all admin users
        const adminUsers = await User.find({ role: 'admin' }).session(session);
        if (adminUsers.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'No admin users found to distribute profits' });
        }
        const adminProfitPerUser = netProfitsAfterBurn / adminUsers.length;

        // Create transactions for burn and distribute profits to admins
        for (const admin of adminUsers) {
            // Admin profit transaction
            const adminTransaction = new Transaction({
                userId: admin.uid,
                amount: adminProfitPerUser,
                marketId: null,
                competitorName: 'AdminProfitBlackjack',
                status: 'approved',
                discordUsername: admin.discordUsername,
                obkUsername: admin.obkUsername
            });
            admin.bpBalance += adminProfitPerUser;
            await adminTransaction.save({ session });
            await admin.save({ session });
        }

        // Burn transaction
        const burnTransaction = new Transaction({
            userId: 'burn',
            amount: burnAmount,
            marketId: null,
            competitorName: 'Burn',
            status: 'approved',
            discordUsername: 'Burn',
            obkUsername: 'Burn'
        });
        await burnTransaction.save({ session });

        // Create Blackjack hand to record the claim
        const claimHand = new BlackjackHand({
            userId: new mongoose.Types.ObjectId(),
            deck: [],
            playerHands: [{
                cards: [],
                value: 0,
                status: 'adminClaim',
                bpCharged: 0,  // Set to 0 as this is not a real charge
                payout: netProfits  // Record the claimed amount as a payout
            }],
            dealerHand: [],
            dealerValue: 0,
            status: 'adminClaim',
            dealerVisibleCards: []
        });
        await claimHand.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            message: 'Profits claimed successfully',
            netProfits,
            burnAmount,
            netProfitsAfterBurn
        });
    } catch (error) {
        console.error('Error claiming blackjack profits:', error.message);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createHand, hit, stand, doubleDown, split, getCurrentHand, claimBlackjackProfits };
