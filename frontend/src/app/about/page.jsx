export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-gray-300">
      
      <h1 className="text-4xl font-bold mb-6 text-white">
        About <span className="text-emerald-400">BetChain</span>
      </h1>

      <p className="text-lg leading-relaxed mb-8">
        BetChain is a project created to showcase skills in Web3 development,
        smart contract integration, and modern interface building using
        Next.js 14 and TailwindCSS. The platform simulates an environment
        where users can connect their wallets and interact with a fictional
        blockchain-based betting and voting system.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-white">
        Project Purpose
      </h2>
      <p className="text-lg leading-relaxed">
        The main goal is not to promote real gambling, but to present a
        technical study on Web3 architecture, on-chain data handling, and
        the creation of a dynamic user experience.
        All functionality is purely demonstrative.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-white">
        Technologies Used
      </h2>
      <ul className="list-disc list-inside text-lg leading-relaxed space-y-2">
        <li>Next.js 14 (App Router)</li>
        <li>TailwindCSS</li>
        <li>Ethers.js</li>
        <li>Smart Contracts in Solidity</li>
        <li>Context API for global state</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-white">
        Important Notice
      </h2>
      <p className="text-lg leading-relaxed text-gray-400">
        BetChain is a portfolio project.  
        No functionality involves real money, real betting, or real candidates.  
        The entire application is completely fictional.
      </p>
    </div>
  );
}
