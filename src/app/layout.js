import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Aven AI Assistant",
  description: "AI-powered customer support agent for Aven - Get help with credit-building products and services",
  icons: {
    icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSB1XGmdj48YSxYcUFsX-HY-vtY-92jTD8IEw&s',
    shortcut: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSB1XGmdj48YSxYcUFsX-HY-vtY-92jTD8IEw&s',
    apple: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSB1XGmdj48YSxYcUFsX-HY-vtY-92jTD8IEw&s',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
