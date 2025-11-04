import Web3 from "web3";
import { createContext, useEffect, useState } from "react";
import BetChainABI from "../abi/BetChain.json";

const TARGET_CHAIN_ID = "0xaa36a7"; // Sepolia
const CONTRACT_ADDRESS = "0x..."; // substituir após deploy

export const BetChainContext = createContext({
  web3: null,
  account: null,
  contract: null,
  connectWallet: async () => {},
});

export const BetChainProvider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      const ethereum = window.ethereum;

      const chainId = await ethereum.request({ method: "eth_chainId" });
      if (chainId !== TARGET_CHAIN_ID) {
        try {
          await ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: TARGET_CHAIN_ID }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: TARGET_CHAIN_ID,
                  chainName: "Sepolia Test Network",
                  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                  rpcUrls: ["https://sepolia.infura.io/v3/YOUR_PROJECT_ID"],
                  blockExplorerUrls: ["https://sepolia.etherscan.io"],
                },
              ],
            });
          } else {
            console.error("Error switching network:", switchError);
            return;
          }
        }
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const web3Instance = new Web3(ethereum);
      const contractInstance = new web3Instance.eth.Contract(BetChainABI, CONTRACT_ADDRESS);

      setWeb3(web3Instance);
      setAccount(accounts[0]);
      setContract(contractInstance);

      ethereum.on("accountsChanged", (accs) => setAccount(accs[0]));
      ethereum.on("chainChanged", () => window.location.reload());
    } else {
      alert("Please install MetaMask to use BetChain!");
    }
  };

  useEffect(() => {
    connectWallet();
  }, []);

  return (
    <BetChainContext.Provider value={{ web3, account, contract }}>
      {children}
    </BetChainContext.Provider>
  );
};
