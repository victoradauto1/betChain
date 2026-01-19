import "./globals.css";

import Footer from "../components/Footer";
import Header from "../components/Header";
import { BetChainProvider } from "../context/BetChainContext";

export const metadata = {
  title: "BetChain",
  description: "Bet on your own bet!",
  icons: {
    icon: "/icon.png",
  },
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
