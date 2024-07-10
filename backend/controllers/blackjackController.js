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
    return {
        handId: handObj._id,
        playerHands: handObj.playerHands,
        dealerVisibleCards: handObj.dealerVisibleCards,
        status: handObj.status,
    };
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

        user.bpBalance = (user.bpBalance - initialBPCharge).toFixed(1);
        await user.save();

        const deck = createDeck();
        const initialPlayerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];
        const playerValue = calculateHandValue(initialPlayerHand);
        const dealerValue = calculateHandValue(dealerHand);

        let status = determineInitialStatus(playerValue, dealerValue);
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

        await handleInitialPayouts(user, newHand, initialBPCharge, status);
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

        await handleHit(hand, handIndex, req.user._id);

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

        await handleStand(hand, handIndex, req.user._id);

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

        await handleDoubleDown(hand, handIndex, req.user._id);

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

        await handleSplit(hand, handIndex, req.user._id);

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

const determineInitialStatus = (playerValue, dealerValue) => {
    if (playerValue === 21 && dealerValue === 21) {
        return 'tie';
    } else if (playerValue === 21) {
        return 'player_blackjack';
    } else if (dealerValue === 21) {
        return 'dealer_blackjack';
    }
    return 'ongoing';
};

const handleInitialPayouts = async (user, hand, initialBPCharge, status) => {
    if (status === 'player_blackjack') {
        const payout = initialBPCharge * 2.5;
        user.bpBalance = (parseFloat(user.bpBalance) + payout).toFixed(1);
        hand.playerHands[0].payout = payout;
    } else if (status === 'tie') {
        user.bpBalance = (parseFloat(user.bpBalance) + initialBPCharge).toFixed(1);
        hand.playerHands[0].payout = initialBPCharge;
    } else if (status === 'dealer_blackjack') {
        hand.dealerVisibleCards = hand.dealerHand;
    }
    await user.save();
};

const handleHit = async (hand, handIndex, userId) => {
    const card = hand.deck.pop();
    hand.playerHands[handIndex].cards.push(card);
    hand.playerHands[handIndex].value = calculateHandValue(hand.playerHands[handIndex].cards);

    if (hand.playerHands[handIndex].value === 21) {
        await stand({ params: { handId: hand._id, handIndex } }, {});
    } else if (hand.playerHands[handIndex].value > 21) {
        hand.playerHands[handIndex].status = 'bust';
        await handleDealerTurnIfAllDone(hand, userId);
    }

    await hand.save();
};

const handleStand = async (hand, handIndex, userId) => {
    hand.playerHands[handIndex].status = 'stand';
    await handleDealerTurnIfAllDone(hand, userId);
    await hand.save();
};

const handleDoubleDown = async (hand, handIndex, userId) => {
    const user = await User.findById(userId);
    const playerHand = hand.playerHands[handIndex];
    const doubleBPCharge = playerHand.bpCharged;

    if (playerHand.cards.length !== 2 || user.bpBalance < doubleBPCharge) {
        throw new Error('Invalid double down');
    }

    user.bpBalance = (parseFloat(user.bpBalance) - doubleBPCharge).toFixed(1);
    await user.save();

    const card = hand.deck.pop();
    playerHand.cards.push(card);
    playerHand.value = calculateHandValue(playerHand.cards);
    playerHand.status = playerHand.value > 21 ? 'bust' : 'double_down';
    playerHand.bpCharged += doubleBPCharge;

    await handleDealerTurnIfAllDone(hand, userId);
    await hand.save();
};

const handleSplit = async (hand, handIndex, userId) => {
    const user = await User.findById(userId);
    const playerHand = hand.playerHands[handIndex];
    const splitBPCharge = playerHand.bpCharged;

    const tenValues = ['10', 'Jack', 'Queen', 'King'];
    const canSplit = playerHand.cards.length === 2 &&
        (playerHand.cards[0].value === playerHand.cards[1].value ||
        (tenValues.includes(playerHand.cards[0].value) && tenValues.includes(playerHand.cards[1].value)));

    if (!canSplit || user.bpBalance < splitBPCharge || hand.playerHands.length >= 8) {
        throw new Error('Invalid split');
    }

    user.bpBalance = (parseFloat(user.bpBalance) - splitBPCharge).toFixed(1);
    await user.save();

    const deck = hand.deck;
    const newHands = [
        { cards: [playerHand.cards[0], deck.pop()], value: 0, status: 'ongoing', bpCharged: playerHand.bpCharged },
        { cards: [playerHand.cards[1], deck.pop()], value: 0, status: 'ongoing', bpCharged: playerHand.bpCharged }
    ];

    newHands.forEach(h => h.value = calculateHandValue(h.cards));
    hand.playerHands.splice(handIndex, 1, ...newHands);

    await hand.save();
};

const handleDealerTurnIfAllDone = async (hand, userId) => {
    const allHandsStandOrBust = hand.playerHands.every(h => h.status !== 'ongoing');
    if (allHandsStandOrBust) {
        await finishDealerTurn(hand);
        await calculatePayouts(hand, userId);
    }
};

const calculatePayouts = async (hand, userId) => {
    const user = await User.findById(userId);

    hand.playerHands.forEach(playerHand => {
        const outcome = determineHandOutcome(playerHand, hand.dealerValue);
        playerHand.status = outcome;

        if (outcome === 'player_wins') {
            const payout = playerHand.bpCharged * 2;
            user.bpBalance = (parseFloat(user.bpBalance) + payout).toFixed(1);
            playerHand.payout = payout;
        } else if (outcome === 'tie') {
            const payout = playerHand.bpCharged;
            user.bpBalance = (parseFloat(user.bpBalance) + payout).toFixed(1);
            playerHand.payout = payout;
        } else {
            playerHand.payout = 0;
        }
    });

    await user.save();
};

module.exports = { createHand, hit, stand, doubleDown, split, getCurrentHand };
