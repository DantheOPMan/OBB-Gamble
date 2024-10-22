import React, { useEffect, useRef, useState } from 'react';
import { Container, Button, Typography, Box, Select, MenuItem, FormControl, InputLabel, OutlinedInput } from '@mui/material';
import { styled } from '@mui/material/styles';
import { playPlinko } from '../firebase';
import { Engine, Render, World, Bodies, Events, Runner, Body } from 'matter-js';

const PlinkoContainer = styled(Container)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e1e',
    color: theme.palette.text.primary,
    fontFamily: theme.typography.fontFamily,
    minHeight: '100vh',
    padding: '2rem',
}));

const PlinkoTitle = styled(Typography)(({ theme }) => ({
    fontSize: '4rem',
    marginBottom: '1rem',
    textShadow: `0 0 10px ${theme.palette.primary.main}`,
}));

const PlinkoButton = styled(Button)(({ theme }) => ({
    padding: '1rem 2rem',
    fontSize: '1.5rem',
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.text.primary,
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginBottom: '2rem',
    transition: 'all 0.3s ease',
    '&:hover': {
        backgroundColor: '#a9a9a9',
        transform: 'scale(1.05)',
    },
}));

const ResultText = styled(Typography)(({ theme }) => ({
    fontSize: '1.5rem',
    marginTop: '1rem',
    textAlign: 'center',
    color: theme.palette.text.secondary,
}));

const CustomFormControl = styled(FormControl)(({ theme }) => ({
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    '& .MuiInputLabel-root': {
        color: '#ffffff',
        marginRight: '1rem',
    },
}));

const CustomSelect = styled(Select)(({ theme }) => ({
    '& .MuiSelect-select': {
        backgroundColor: '#333333',
        color: '#ffffff',
    },
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: '#ffffff',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: '#ffffff',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: '#ffffff',
    },
}));

const CustomInput = styled(OutlinedInput)(({ theme }) => ({
    backgroundColor: '#333333',
    color: '#ffffff',
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: '#ffffff',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: '#ffffff',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: '#ffffff',
    },
}));

const PlinkoBoard = ({ onDropBalls, onBallLanded, balance }) => {
    const [latestResult, setLatestResult] = useState(null);
    const [recentResults, setRecentResults] = useState([]);
    const refContainer = useRef(null);
    const [bottomColors, setBottomColors] = useState(Array(15).fill('#ffffff'));
    const [isButtonDisabled, setIsButtonDisabled] = useState(false);
    const [numBalls, setNumBalls] = useState(1);
    const [amount, setAmount] = useState(1);
    const engineRef = useRef(Engine.create());
    const runnerRef = useRef(Runner.create());
    const ballsRef = useRef([]);
    const ballInteractionsRef = useRef({});

    const multipliers = [100, 20, 8, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 8, 20, 100];

    const playPlinkoGame = async () => {
        try {
            setIsButtonDisabled(true);
            setTimeout(() => setIsButtonDisabled(false), 1000);

            for (let i = 0; i < numBalls; i++) {
                const amountToPlay = Math.min(amount, 10);
                onDropBalls(amountToPlay);
                const { result, multiplier } = await playPlinko(amountToPlay);
                const targetBuckets = multipliers.reduce((acc, m, index) => {
                    if (m === multiplier) acc.push(index);
                    return acc;
                }, []);

                const selectedBucket = targetBuckets[Math.floor(Math.random() * targetBuckets.length)];

                dropBall(selectedBucket, result, multiplier);
            }
        } catch (error) {
            console.error('Error playing Plinko:', error);
        }
    };

    const dropBall = (targetBucket, result, multiplier) => {
        const centerX = refContainer.current.clientWidth / 2;
        let x;
        if (targetBucket < 7) {
            x = centerX - Math.floor(Math.random() * 31);
        } else if (targetBucket > 7) {
            x = centerX + Math.floor(Math.random() * 31);
        } else {
            x = centerX + Math.floor(Math.random() * 61) - 30;
        }

        const ball = Bodies.circle(x, 0, 10, {
            restitution: 0.8,
            friction: 0.3,
            density: 0.5,
            label: 'particle',
            collisionFilter: {
                group: -1
            },
        });
        World.add(engineRef.current.world, ball);
        ballsRef.current.push({
            body: ball,
            targetBucket: targetBucket,
            result: result,
            multiplier: multiplier
        });
        ballInteractionsRef.current[ball.id] = new Set();
    };

    useEffect(() => {
        const engine = engineRef.current;
        const render = Render.create({
            element: refContainer.current,
            engine: engine,
            options: {
                width: 700,
                height: 800,
                wireframes: false,
                background: '#2c2c2c',
            }
        });

        const bottomHeight = 40;
        const gap = 10;
        const boxWidth = (render.options.width - (multipliers.length - 1) * gap) / multipliers.length;
        const pegSpacing = boxWidth + gap;
        const pegRadius = pegSpacing / 7;

        const rows = 16;
        const verticalSpacing = pegSpacing * 0.84;

        for (let row = 2; row < rows; row++) {
            for (let col = 0; col <= row; col++) {
                const x = col * pegSpacing + (render.options.width / 2) - (row * pegSpacing / 2);
                const y = row * verticalSpacing + verticalSpacing / 2;
                World.add(engine.world, Bodies.circle(x, y, pegRadius, {
                    isStatic: true,
                    restitution: 0.5,
                    friction: 0.3,
                    label: 'plinko'
                }));
            }
        }

        const boxYOffset = 100;
        multipliers.forEach((_, index) => {
            const x = index * (boxWidth + gap) + boxWidth / 2;
            const bottom = Bodies.rectangle(x, render.options.height - boxYOffset - bottomHeight / 2, boxWidth, bottomHeight, {
                isStatic: true,
                render: {
                    fillStyle: bottomColors[index]
                },
                label: `bottom-${index}`
            });
            World.add(engine.world, bottom);
        });

        Events.on(engineRef.current, 'collisionStart', (event) => {
            const pairs = event.pairs;
            for (let i = 0; i < pairs.length; i++) {
                const { bodyA, bodyB } = pairs[i];
                if (bodyA.label.startsWith('bottom-') || bodyB.label.startsWith('bottom-')) {
                    const bottomIndex = bodyA.label.startsWith('bottom-') ?
                        parseInt(bodyA.label.split('-')[1], 10) :
                        parseInt(bodyB.label.split('-')[1], 10);

                    setBottomColors(prevColors => {
                        const newColors = [...prevColors];
                        newColors[bottomIndex] = '#d75f5f';
                        return newColors;
                    });

                    setTimeout(() => {
                        setBottomColors(prevColors => {
                            const newColors = [...prevColors];
                            newColors[bottomIndex] = '#ffffff';
                            return newColors;
                        });
                    }, 100);

                    const ball = bodyA.label === 'particle' ? bodyA : bodyB;
                    const ballData = ballsRef.current.find(b => b.body === ball);
                    if (ballData) {
                        setLatestResult({ result: ballData.result, multiplier: ballData.multiplier });
                        setRecentResults(prevResults => {
                            const newResults = [{ result: ballData.result, multiplier: ballData.multiplier }, ...prevResults];
                            return newResults.slice(0, 10); // Keep only the 10 most recent results
                        });
                        onBallLanded(parseFloat(ballData.result));  // Update balance for this ball
                    }

                    World.remove(engineRef.current.world, ball);
                    ballsRef.current = ballsRef.current.filter(b => b.body !== ball);
                }
            }
        });

        Runner.run(runnerRef.current, engine);
        Render.run(render);

        return () => {
            Render.stop(render);
            Runner.stop(runnerRef.current);
            World.clear(engine.world);
            Engine.clear(engine);
            render.canvas.remove();
            render.canvas = null;
            render.context = null;
        };
    }, []);

    useEffect(() => {
        const handleCollisions = (event) => {
            const pairs = event.pairs;
            const maxVelocity = 1.75;

            for (let i = 0; i < pairs.length; i++) {
                const { bodyA, bodyB } = pairs[i];
                const ballBody = bodyA.label === 'particle' ? bodyA : (bodyB.label === 'particle' ? bodyB : null);
                const peg = bodyA.label === 'plinko' ? bodyA : (bodyB.label === 'plinko' ? bodyB : null);

                if (ballBody && peg) {
                    if (ballInteractionsRef.current[ballBody.id] && ballInteractionsRef.current[ballBody.id].has(peg.id)) {
                        continue; // Skip this interaction if it's already happened
                    }

                    if (!ballInteractionsRef.current[ballBody.id]) {
                        ballInteractionsRef.current[ballBody.id] = new Set();
                    }
                    ballInteractionsRef.current[ballBody.id].add(peg.id);

                    const ballData = ballsRef.current.find(b => b.body === ballBody);
                    if (ballData) {
                        const { targetBucket } = ballData;
                        let correctTarget = targetBucket;
                        if (correctTarget === 5) {
                            correctTarget = 6;
                        } else if (correctTarget === 9) {
                            correctTarget = 8;
                        }
                        const targetX = (correctTarget * (refContainer.current.clientWidth / multipliers.length)) + ((refContainer.current.clientWidth / multipliers.length) / 2);
                        const ballX = ballBody.position.x;
                        const distance = targetX - ballX;

                        const movingTowardsTarget = (distance > 0 && ballBody.velocity.x > 0) || (distance < 0 && ballBody.velocity.x < 0);

                        const bucketWidth = refContainer.current.clientWidth / multipliers.length;
                        const isAboveTargetBucket = Math.abs(distance) < bucketWidth / 2.5;

                        let newVelocityX = ballBody.velocity.x;
                        let ymultiplier = 0.75;

                        if (!isAboveTargetBucket) {
                            const maxDistance = refContainer.current.clientWidth / 2;

                            const distanceFactor = Math.min(Math.abs(distance) / maxDistance, 1);

                            const baseModifier = 1.17;
                            const maxAdditionalModifier = 0.25;
                            const progressiveModifier = baseModifier + (maxAdditionalModifier * Math.pow(distanceFactor, 2));

                            const directionModifier = movingTowardsTarget ? 1 : -1.2;

                            const velocityModifier = progressiveModifier * directionModifier;

                            newVelocityX *= velocityModifier;
                        } else {
                            ymultiplier = 0.5;
                            newVelocityX *= 0.2;
                        }

                        let newVelocityY = ballBody.velocity.y * ymultiplier - 0.4;


                        if (Math.abs(newVelocityX) > maxVelocity) {
                            newVelocityX = Math.sign(newVelocityX) * maxVelocity;
                        }
                        if (Math.abs(newVelocityY) > maxVelocity) {
                            newVelocityY = Math.sign(newVelocityY) * maxVelocity;
                        }

                        Body.setVelocity(ballBody, {
                            x: newVelocityX,
                            y: newVelocityY
                        });

                        const guidanceForce = 30 * Math.sign(distance);
                        Body.applyForce(ballBody, ballBody.position, { x: guidanceForce, y: -0.0002 });
                    }
                }
            }
        };

        const preventBallCollision = (event) => {
            const pairs = event.pairs;

            for (let i = 0; i < pairs.length; i++) {
                const { bodyA, bodyB } = pairs[i];
                if (bodyA.label === 'particle' && bodyB.label === 'particle') {
                    Body.setVelocity(bodyA, { x: -bodyA.velocity.x, y: -bodyA.velocity.y });
                    Body.setVelocity(bodyB, { x: -bodyB.velocity.x, y: -bodyB.velocity.y });
                }
            }
        };

        Events.on(engineRef.current, 'collisionEnd', handleCollisions);
        Events.on(engineRef.current, 'collisionActive', preventBallCollision);

        return () => {
            Events.off(engineRef.current, 'collisionEnd', handleCollisions);
            Events.off(engineRef.current, 'collisionActive', preventBallCollision);
            ballInteractionsRef.current = {};
        };
    }, [multipliers.length]);

    const bottomHeight = 40;
    const gap = 10;
    const boxWidth = (700 - (multipliers.length - 1) * gap) / multipliers.length;

    const totalCost = numBalls * amount;
    const isDropDisabled = isButtonDisabled || totalCost > balance;

    return (
        <PlinkoContainer>
            <PlinkoTitle>BPlinko</PlinkoTitle>
            <div ref={refContainer} style={{ position: 'relative' }}>
                {multipliers.map((multiplier, index) => (
                    <div
                        key={index}
                        style={{
                            position: 'absolute',
                            bottom: `${100}px`,
                            left: `${index * (boxWidth + gap) + boxWidth / 2}px`,
                            transform: 'translateX(-50%)',
                            color: '#000000',
                            fontSize: '0.8rem',
                            width: `${boxWidth - 2}px`,
                            textAlign: 'center',
                            backgroundColor: bottomColors[index],
                            height: `${bottomHeight}px`,
                            lineHeight: `${bottomHeight}px`
                        }}
                    >
                        {multiplier}x
                    </div>
                ))}
            </div>
            <PlinkoButton onClick={playPlinkoGame} disabled={isDropDisabled}>
                Drop Ball{numBalls > 1 ? 's' : ''}
            </PlinkoButton>
            <CustomFormControl>
                <Typography variant="body1" style={{ color: '#ffffff', marginRight: '1rem' }}>
                    Number of Balls:
                </Typography>
                <CustomSelect
                    labelId="num-balls-label"
                    value={numBalls}
                    onChange={(e) => setNumBalls(e.target.value)}
                    MenuProps={{
                        PaperProps: {
                            style: {
                                backgroundColor: '#333333',
                            },
                        },
                    }}
                >
                    {[...Array(10).keys()].map(i => (
                        <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>
                    ))}
                </CustomSelect>
            </CustomFormControl>
            <CustomFormControl>
                <Typography variant="body1" style={{ color: '#ffffff', marginRight: '1rem' }}>
                    Amount per Ball:
                </Typography>
                <CustomInput
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Math.min(e.target.value, 50))}
                    inputProps={{ min: 1, max: 50 }}
                />
            </CustomFormControl>
            {latestResult && (
                <ResultText>
                    Latest result: {latestResult.result} BP (Multiplier: {latestResult.multiplier}x)
                </ResultText>
            )}
            <Box mt={4}>
                <Typography variant="h6">Recent Results</Typography>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {recentResults.map((result, index) => (
                        <li key={index}>
                            {result.result} BP (Multiplier: {result.multiplier}x)
                        </li>
                    ))}
                </ul>
            </Box>
        </PlinkoContainer>
    );
};

export default PlinkoBoard;
