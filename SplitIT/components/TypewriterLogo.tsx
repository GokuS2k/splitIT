import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { COLORS } from '@/constants/theme';

interface TypewriterLogoProps {
    text?: string;
    typingSpeed?: number;
    deletingSpeed?: number;
    pauseTime?: number;
    fontSize?: number;
}

export default function TypewriterLogo({
    text = 'SPLITIT',
    typingSpeed = 150,
    deletingSpeed = 100,
    pauseTime = 2000,
    fontSize = 40,
}: TypewriterLogoProps) {
    const [displayText, setDisplayText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [cursorVisible, setCursorVisible] = useState(true);

    useEffect(() => {
        let timer: any;

        const handleTyping = () => {
            const fullText = text;

            if (!isDeleting) {
                // Typing
                if (displayText.length < fullText.length) {
                    setDisplayText(fullText.substring(0, displayText.length + 1));
                    timer = setTimeout(handleTyping, typingSpeed);
                } else {
                    // Finished typing, wait then start deleting
                    timer = setTimeout(() => setIsDeleting(true), pauseTime);
                }
            } else {
                // Deleting
                if (displayText.length > 0) {
                    setDisplayText(fullText.substring(0, displayText.length - 1));
                    timer = setTimeout(handleTyping, deletingSpeed);
                } else {
                    // Finished deleting, wait then start typing again
                    setIsDeleting(false);
                    timer = setTimeout(handleTyping, typingSpeed);
                }
            }
        };

        timer = setTimeout(handleTyping, typingSpeed);

        return () => clearTimeout(timer);
    }, [displayText, isDeleting, text, typingSpeed, deletingSpeed, pauseTime]);

    // Cursor blinking effect
    useEffect(() => {
        const cursorTimer = setInterval(() => {
            setCursorVisible((prev) => !prev);
        }, 500);
        return () => clearInterval(cursorTimer);
    }, []);

    // Split the display text for styling (SPLIT / IT)
    // Usually SPLIT in moonlight white, IT in primary cyan
    const splitIndex = displayText.toLowerCase().startsWith('split') ? 5 : -1;

    const renderText = () => {
        if (splitIndex !== -1) {
            const whitePart = displayText.substring(0, Math.min(displayText.length, splitIndex));
            const cyanPart = displayText.substring(Math.min(displayText.length, splitIndex));
            return (
                <>
                    <Text style={[styles.whiteText, { fontSize }]}>{whitePart}</Text>
                    <Text style={[styles.cyanText, { fontSize }]}>{cyanPart}</Text>
                </>
            );
        }
        return <Text style={[styles.whiteText, { fontSize }]}>{displayText}</Text>;
    };

    return (
        <View style={styles.container}>
            <View style={styles.textContainer}>
                {renderText()}
                <Text style={[styles.cursor, { opacity: cursorVisible ? 1 : 0, fontSize }]}>_</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
    },
    textContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    whiteText: {
        fontWeight: '900',
        letterSpacing: 5,
        color: COLORS.text,
        textShadowColor: COLORS.glow,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    cyanText: {
        fontWeight: '900',
        letterSpacing: 5,
        color: COLORS.primary,
        textShadowColor: COLORS.glow,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    cursor: {
        color: COLORS.primary,
        fontWeight: '900',
        marginLeft: 2,
    },
});
