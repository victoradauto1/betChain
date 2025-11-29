import "./globals.css";

import { BetChainProvider } from "../context/betChainContext";
import Footer from "../components/Footer";
import Header from "../components/Header"

export const metadata = {
  title: "BetCandidate",
  description: "Bet on your best candidate!",
  charSet: "utf-8",
  content: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen flex flex-col">
        <BetChainProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </BetChainProvider>
      </body>
    </html>
  );
}
