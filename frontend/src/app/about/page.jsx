export default function About() {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-gray-300">
        
        <h1 className="text-4xl font-bold mb-6 text-white">
          About <span className="text-emerald-400">BetCandidate</span>
        </h1>
  
        <p className="text-lg leading-relaxed mb-8">
          BetCandidate é um projeto criado com foco em demonstrar habilidades em 
          desenvolvimento Web3, integração com smart contracts e construção de interfaces
          modernas utilizando Next.js 14 e TailwindCSS. A plataforma simula um ambiente 
          onde usuários podem conectar suas wallets e interagir com um sistema fictício 
          de apostas e votação baseada em blockchain.
        </p>
  
        <h2 className="text-2xl font-semibold mt-10 mb-4 text-white">
          Objetivo do Projeto
        </h2>
        <p className="text-lg leading-relaxed">
          O objetivo principal não é promover jogos de apostas reais, mas sim apresentar 
          um estudo técnico sobre arquitetura Web3, manipulação de dados on-chain e 
          criação de uma experiência de usuário dinâmica.  
          Todas as funcionalidades possuem caráter exclusivamente demonstrativo.
        </p>
  
        <h2 className="text-2xl font-semibold mt-10 mb-4 text-white">
          Tecnologias Utilizadas
        </h2>
        <ul className="list-disc list-inside text-lg leading-relaxed space-y-2">
          <li>Next.js 14 (App Router)</li>
          <li>TailwindCSS</li>
          <li>Ethers.js</li>
          <li>Smart Contracts em Solidity</li>
          <li>Context API para estado global</li>
        </ul>
  
        <h2 className="text-2xl font-semibold mt-10 mb-4 text-white">
          Aviso Importante
        </h2>
        <p className="text-lg leading-relaxed text-gray-400">
          BetCandidate é um projeto de portfólio.  
          Nenhuma funcionalidade envolve dinheiro real, apostas reais ou candidatos reais.  
          Toda a aplicação é totalmente fictícia.
        </p>
      </div>
    );
  }
  