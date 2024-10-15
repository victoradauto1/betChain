"use client";
import Footer from "@/componets/Footer";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {

  const {push} = useRouter();
  const [message, setMessage] = useState();

  useEffect(() => {
    document.title = "BetCandidate | Login";
  }, []);

  function btnLoginClick(){
    push("/bet")
  };

  return (
    <div className="container px-4 py-5">
      <div className="row flex-lg-row-reverse align-items-center g-5 py-5 ">
        <div className="col-6 ">
          <img
            src="https://i.abcnewsfe.com/a/b1b973de-cea7-49af-ac28-deb81fbc8b8f/trump-harris-ap-rt-gmh-240723_1721741260182_hpMain.jpg"
            className="d-block mx-lg-auto img-fluid"
            width="700"
            height="500"
          />
        </div>
        <div className="col-6 ">
          <h1 className="display-5 fw-bold text-body-emphasis lh-1 mb-3">
            BetCandidate
          </h1>
          <p className="lead">Apostas on-chain nas eleições americanas.</p>
          <p className="lead">
            Autentique-se com sua carteira e deixe a sua aposta na disputa para
            Casa Branca de 2024.
          </p>
          <div className="d-flex justify-content-start ">
            <button type="button" className="btn btn-primary btn-lg px-4" onClick={btnLoginClick}>
              <img
                src="/images/MetaMask_Fox.svg.png"
                width={64}
                className="me-3"
              />
              Conectar-se com MetaMask
            </button>
          </div>
          <p className="message">{message}</p>
        </div>
      </div>
      <Footer/>
    </div>
  );
}
