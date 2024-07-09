const BlackjackHand = require('../models/blackjackHandModel');
const User = require('../models/userModel');

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
        handId: handObj._id, // Include the hand ID
        playerHands: handObj.playerHands,
        dealerVisibleCards: handObj.dealerVisibleCards,
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

const finishDealerTurn = async (hand) => {
    while (hand.dealerValue < 17) {
        const card = hand.deck.pop();
        hand.dealerHand.push(card);
        hand.dealerValue = calculateHandValue(hand.dealerHand);
    }

    hand.status = 'completed';
    hand.dealerVisibleCards = [...hand.dealerHand];
    await hand.save();
};

const createHand = async (req, res) => {
    const { initialBPCharge } = req.body;

    try {
        const userId = req.user._id;
        const existingHand = await BlackjackHand.findOne({ userId, status: 'ongoing' });
        if (existingHand) {
            return res.status(400).json({ message: 'You already have an ongoing hand. Resolve it before starting a new one.' });
        }

        const user = await User.findById(userId);
        if (user.bpBalance < initialBPCharge) {
            return res.status(400).json({ message: 'Insufficient BP balance to start a new hand.' });
        }

        // Deduct the initial BP charge from the user's balance
        user.bpBalance -= initialBPCharge;
        await user.save();

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
            await user.save();
        } else if (status === 'tie') {
            user.bpBalance += initialBPCharge;
            await user.save();
        }

        await newHand.save();
        res.status(201).json(filterHandData(newHand));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const hit = async (req, res) => {
    try {
        const { handId, handIndex } = req.params;
        const hand = await BlackjackHand.findById(handId);
        if (!hand || hand.status !== 'ongoing') {
            return res.status(404).json({ message: 'Hand not found or game already finished' });
        }
        verifyUserOwnership(hand, req.user._id);

        // Ensure the player is interacting with the current hand
        if (handIndex > 0 && hand.playerHands[handIndex - 1].status === 'ongoing') {
            return res.status(400).json({ message: 'You must complete the current hand before interacting with the next hand.' });
        }

        const card = hand.deck.pop();
        hand.playerHands[handIndex].cards.push(card);
        hand.playerHands[handIndex].value = calculateHandValue(hand.playerHands[handIndex].cards);

        // Check if the player hits 21
        if (hand.playerHands[handIndex].value === 21) {
            // Call the stand logic directly
            return await stand(req, res);
        } else if (hand.playerHands[handIndex].value > 21) {
            hand.playerHands[handIndex].status = 'bust';
        }

        // Save the hand and check if all hands are done
        await hand.save();
        const allHandsStandOrBust = hand.playerHands.every(h => h.status !== 'ongoing');
        if (allHandsStandOrBust) {
            await finishDealerTurn(hand);
            const user = await User.findById(req.user._id);

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

            await user.save();
        }

        res.status(200).json(filterHandData(hand));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const stand = async (req, res) => {
    try {
        const { handId, handIndex } = req.params;
        const hand = await BlackjackHand.findById(handId);
        if (!hand || hand.status !== 'ongoing') {
            return res.status(404).json({ message: 'Hand not found or game already finished' });
        }
        verifyUserOwnership(hand, req.user._id);

        // Ensure the player is interacting with the current hand
        if (handIndex > 0 && hand.playerHands[handIndex - 1].status === 'ongoing') {
            return res.status(400).json({ message: 'You must complete the current hand before interacting with the next hand.' });
        }

        hand.playerHands[handIndex].status = 'stand';

        const allHandsStandOrBust = hand.playerHands.every(h => h.status !== 'ongoing');
        if (allHandsStandOrBust) {
            await finishDealerTurn(hand);
            console.log("all hands resolved")
            const user = await User.findById(req.user._id);
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

            await user.save();
        }

        await hand.save();
        res.status(200).json(filterHandData(hand));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const doubleDown = async (req, res) => {
    try {
        const { handId, handIndex } = req.params;
        const hand = await BlackjackHand.findById(handId);
        if (!hand || hand.status !== 'ongoing') {
            return res.status(404).json({ message: 'Hand not found or game already finished' });
        }
        verifyUserOwnership(hand, req.user._id);

        const user = await User.findById(req.user._id);
        const playerHand = hand.playerHands[handIndex];
        if (playerHand.cards.length !== 2) {
            return res.status(400).json({ message: 'Can only double down on a hand with exactly 2 cards.' });
        }

        const doubleBPCharge = playerHand.bpCharged;
        if (user.bpBalance < doubleBPCharge) {
            return res.status(400).json({ message: 'Insufficient BP balance to double down.' });
        }

        // Deduct the double BP charge from the user's balance
        user.bpBalance -= doubleBPCharge;
        await user.save();

        const card = hand.deck.pop();
        playerHand.cards.push(card);
        playerHand.value = calculateHandValue(playerHand.cards);
        playerHand.status = 'double_down';
        playerHand.bpCharged += doubleBPCharge; // Update the BP charge for this hand

        // Check if the player busts
        if (playerHand.value > 21) {
            playerHand.status = 'bust';
        }

        await finishDealerTurn(hand);

        const allHandsStandOrBust = hand.playerHands.every(h => h.status !== 'ongoing');
        if (allHandsStandOrBust) {
            const user = await User.findById(req.user._id);

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

            await user.save();
        }

        await hand.save();
        res.status(200).json(filterHandData(hand));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const split = async (req, res) => {
    try {
        const { handId, handIndex } = req.params;
        const hand = await BlackjackHand.findById(handId);
        if (!hand || hand.status !== 'ongoing') {
            return res.status(404).json({ message: 'Hand not found or game already finished' });
        }
        verifyUserOwnership(hand, req.user._id);

        const user = await User.findById(req.user._id);
        const playerHand = hand.playerHands[handIndex];
        if (playerHand.cards.length !== 2 || playerHand.cards[0].value !== playerHand.cards[1].value) {
            return res.status(400).json({ message: 'Cannot split this hand' });
        }

        // Check if splitting will exceed the maximum number of hands (4)
        if (hand.playerHands.length >= 4) {
            return res.status(400).json({ message: 'Cannot split further, maximum number of hands reached.' });
        }

        const splitBPCharge = playerHand.bpCharged;
        if (user.bpBalance < splitBPCharge) {
            return res.status(400).json({ message: 'Insufficient BP balance to split the hand.' });
        }

        // Deduct the split BP charge for the new hand
        user.bpBalance -= splitBPCharge;
        await user.save();

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
        await hand.save();

        res.status(200).json(filterHandData(hand));
    } catch (error) {
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

const getHandStatus = async (req, res) => {
    try {
        const { handId } = req.params;
        const hand = await BlackjackHand.findById(handId);
        if (!hand) {
            return res.status(404).json({ message: 'Hand not found' });
        }
        res.status(200).json({ status: hand.status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createHand, hit, stand, doubleDown, split, getCurrentHand, getHandStatus };