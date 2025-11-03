"use client";
import Footer from "@/componets/Footer";
import { claimPrize, getDispute, placeBet } from "@/services/web3Services";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Web3 from "web3";

export default function Bet() {
  const { push } = useRouter();

  const [message, setMessage] = useState("");
  const [dispute, setDispute] = useState({
    candidate1: "Loading...",
    candidate2: "Loading...",
    img1: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXJ_BrWqTL0WDvguyhgr0CjJCHQl_ryxJ6PEc-Jneqw2DtHZB6tT1qef7q6CD-zR8MULg&usqp=CAU",
    img2: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXJ_BrWqTL0WDvguyhgr0CjJCHQl_ryxJ6PEc-Jneqw2DtHZB6tT1qef7q6CD-zR8MULg&usqp=CAU",
    total1: 0,
    total2: 0,
    winner: 0,
  });

  useEffect(() => {
    document.title = "BetChain | Beting";
  });

  useEffect(() => {
    if (!localStorage.getItem("wallet")) return push("/");
    setMessage("Carregando os dados da aposta... aguarde...");
    getDispute()
      .then((dispute) => {
        setDispute(dispute);
        setMessage("");
      })
      .catch((err) => {
        console.error(err);
        setMessage(err.message);
      });
  }, []);

  function processBet(candidate) {
    setMessage("Conectando na carteira... aguarde...");
    const amout = prompt("Qual quantia em BNB que você deseja apostar?", "1");
    placeBet(candidate, amout)
      .then(() => {
        alert(
          "Aposta recebida com sucesso, pode demorar alguns instantes para que ela seja processada..."
        );
        setMessage("");
      })
      .catch((err) => {
        console.error(err);
        setMessage(err.message);
      });
  }

  function btnClaimClick() {
    setMessage("Conectando na carteira... aguarde...");
    claimPrize()
      .then(() => {
        alert(
          "Coleta do prêmio feita com sucesso. Pode demorar alguns instantes para que ela seja processada..."
        );
        setMessage("");
      })
      .catch((err) => {
        console.error(err);
        setMessage(err.message);
      });
  }

  return (
    <div className="container px-4 py-5">
      <div className="row align-items-center">
        <h1 className="display-5 fw-bold text-body-emphasis lh-1 mb-3">
          BetChain
        </h1>
        <p className="lead">Apostas on-chain nas eleições americanas.</p>
        {dispute.winner == 0 ? (
          <p className="lead">
            Você tem até dia da eleição para deixar a sua aposta em um dos
            candidatos.
          </p>
        ) : (
          <p className="lead">
            As apostas foram encerradas. Veja o vencdor abaixo e solicite o seu
            prêmio, caso você tenha acertado.
          </p>
        )}
      </div>
      <div className="row flex-lg-row-reverse align-items-center g-1 py-5">
        {dispute.winner == 0 || dispute.winner == 1 ? (
          <div className="col">
            <h3 className="my-2 d-block mx-auto" style={{ width: 250 }}>
              {dispute.candidate1}
            </h3>
            <img src={dispute.img1} width={250} className="d-block mx-auto" />
            {dispute.winner == 0 ? (
              <button
                className="btn btn-primary p-3 my-2 d-block mx-auto"
                style={{ width: 250 }}
                onClick={() => processBet(1)}
              >
                Aposto neste candidato
              </button>
            ) : (
              <button
                className="btn btn-primary p-3 my-2 d-block mx-auto"
                style={{ width: 250 }}
                onClick={() => btnClaimClick()}
              >
                Sacar o meu prêmio
              </button>
            )}
            <span
              className="badge text-bg-secondary d-block mx-auto"
              style={{ width: 250 }}
            >
              {Web3.utils.fromWei(dispute.total1, "ether")} BNB apostados
            </span>
          </div>
        ) : (
          <></>
        )}

        {dispute.winner == 0 || dispute.winner == 2 ? (
          <div className="col">
            <h3 className="my-2 d-block mx-auto" style={{ width: 250 }}>
              {dispute.candidate2}
            </h3>
            <img src={dispute.img2} width={250} className="d-block mx-auto" />
            {dispute.winner == 0 ? (
              <button
                className="btn btn-primary p-3 my-2 d-block mx-auto"
                style={{ width: 250 }}
                onClick={() => processBet(2)}
              >
                Aposto neste candidato
              </button>
            ) : (
              <button
                className="btn btn-primary p-3 my-2 d-block mx-auto"
                style={{ width: 250 }}
                onClick={() => btnClaimClick()}
              >
                Sacar o meu prêmio
              </button>
            )}
            <span
              className="badge text-bg-secondary d-block mx-auto"
              style={{ width: 250 }}
            >
              {Web3.utils.fromWei(dispute.total2, "ether")} BNB apostados
            </span>
          </div>
        ) : (
          <></>
        )}
      </div>
      <div className="row align-items-center">
        <p className="message">{message}</p>
      </div>
      <Footer />
    </div>
  );
}