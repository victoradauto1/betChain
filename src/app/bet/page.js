"use client";
import Footer from "@/componets/Footer";
import { useEffect } from "react";

export default function Bet() {
  useEffect(() => {
    document.title = "BetCandidate | Beting";
  });
  return (
    <div className="container px-4 py-5">
      <div className="row align-items-center">
        <h1 className="display-5 fw-bold text-body-emphasis lh-1 mb-3">
          BetCandidate
        </h1>
        <p className="lead">Apostas on-chain nas eleições americanas.</p>
          <p className="lead">
            Você tem até dia da eleição para deixar a sua aposta em um dos candidatos.
          </p>
      </div>
      <div className="row flex-lg-row-reverse align-items-center g-1 py-5">
        <div className="col">
            <h3 className="my-2 d-block mx-auto" style={{width:250}}>
                Donald Trump
            </h3>
            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1MWm4Uc-yhWB5bkRg8r_Vy6ueABFtDb_qSA&s" className="d-block mx-auto img-fluid rounded" width={250}/>
            <button className="btn btn-primary p-3 my-2 d-block mx-auto" style={{width:250}} > Aposto neste candidato</button>
            <span  className="badge text-bg-secondary d-block mx-auto" style={{width:250}}>0 POL apostados</span>
        </div>
        <div className="col">
            <h3 className="my-2 d-block mx-auto" style={{width:250}}>
                Kamala Harris
            </h3>
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Kamala_Harris_Vice_Presidential_Portrait.jpg/230px-Kamala_Harris_Vice_Presidential_Portrait.jpg" className="d-block mx-auto img-fluid rounded" width={250}/>
            <button className="btn btn-primary p-3 my-2 d-block mx-auto" style={{width:250}} > Aposto neste candidato</button>
            <span  className="badge text-bg-secondary d-block mx-auto" style={{width:250}}>0 POL apostados</span>
        </div>
      </div>
      <div className="row align-items-center">
        <p className="message"></p>
      </div>
      <Footer />
    </div>
  );
}
