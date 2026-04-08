import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { SettingsProvider } from '@/context/SettingsContext';
import Script from 'next/script';
import ScrollToTop from '@/components/ScrollToTop';
import DraggableChat from '@/components/DraggableChat';

export const metadata: Metadata = {
    title: 'Simple Money - Making Everything Simple',
    description: 'Simple Money platform - making everything simple and giving you a better technological experience',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            </head>
            <body suppressHydrationWarning>
                <SettingsProvider>
                    <ThemeProvider>
                        <AuthProvider>
                            <LanguageProvider>
                                <CurrencyProvider>
                                    <NotificationProvider>
                                        <ScrollToTop />
                                        <DraggableChat />
                                        {children}
                                    </NotificationProvider>
                                </CurrencyProvider>
                            </LanguageProvider>
                        </AuthProvider>
                    </ThemeProvider>
                </SettingsProvider>

                <Script id="tawk-to" strategy="afterInteractive">
                    {`
                    var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
                    
                    // Device-specific privacy fix
                    var sessionId = localStorage.getItem('chat_session_id');
                    if (!sessionId) {
                        sessionId = 'SESH-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();
                        localStorage.setItem('chat_session_id', sessionId);
                    }
                    
                    Tawk_API.visitor = {
                        name: 'Visitor ' + sessionId.substring(5, 13),
                        email: sessionId + '@internal.node'
                    };

                    Tawk_API.onLoad = function(){
                        Tawk_API.hideWidget();
                    };

                    Tawk_API.onChatMinimized = function(){
                        Tawk_API.hideWidget();
                    };

                    (function(){
                    var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
                    s1.async=true;
                    s1.src='https://embed.tawk.to/69abca0b5d52b31c3ad1057a/1jj3gqfog';
                    s1.charset='UTF-8';
                    s1.setAttribute('crossorigin','*');
                    s0.parentNode.insertBefore(s1,s0);
                    })();
                    `}
                </Script>
            </body>
        </html>
    );
}
