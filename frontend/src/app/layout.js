import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

import { BetChainProvider } from "@/context/betChainContext";

export const metadata = {
  title: "BetCandidate",
  description: "Bet on your best candidate!",
  charSet: "utf-8",
  content: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
      <BetChainProvider>
          {children}
      </BetChainProvider>
      </body>
    </html>
  );
}
