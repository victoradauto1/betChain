import Web3 from "web3";
import ABI from "./ABI.json";

const CONTRACT_ADRESS = "0x8858B329210b716C1bF1fd745995EA2be9df925A";

export async function doLogin() {
  if (!window.ethereum) throw new Error("A MetaMask não está instalada.");

  const web3 = new Web3(window.ethereum);
  const accounts = await web3.eth.requestAccounts();
  if (!accounts || !accounts.length) throw new Error("Acesso não permitido.");

  localStorage.setItem("wallet", accounts[0]);
  return accounts[0];
}

function getContract() {
  if (!window.ethereum) throw new Error("A MetaMask não está instalada.");

  const from = localStorage.getItem("wallet");
  const web3 = new Web3(window.ethereum);
  return new web3.eth.Contract(ABI, CONTRACT_ADRESS, { from });
}

export async function getDispute(){
    const contract = getContract();
    return contract.methods.dispute().call();
}

export async function placeBet(candidate, amoutInEth){
    const contract = getContract();
    return contract.methods.bet(candidate).send({
        value: Web3.utils.toWei(amoutInEth, "ether")
    })
};

export async function finishDispute(){
    const contract = getContract();

    return contract.methods.finish(winner).send()
};

export async function claimPrize(){
    const contract = getContract();

    return contract.methods.claim().send();
};