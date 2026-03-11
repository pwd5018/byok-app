import { Plus_Jakarta_Sans, Roboto_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const bodyFont = Plus_Jakarta_Sans({
    subsets: ["latin"],
    variable: "--font-body",
});

const displayFont = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-display",
});

const monoFont = Roboto_Mono({
    subsets: ["latin"],
    variable: "--font-code",
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable}`}>
        <Providers>{children}</Providers>
        </body>
        </html>
    );
}
