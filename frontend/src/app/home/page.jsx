import { useEffect, useState } from "react";
import { useBetChain } from "../context/BetChainContext";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const { contract, account, connectWallet } = useBetChain();
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 🔄 Carrega todas as apostas existentes
  useEffect(() => {
    const loadBets = async () => {
      if (!contract) return;
      setLoading(true);
      try {
        const nextId = await contract.nextId();
        const total = Number(nextId);
        const betsList = [];

        for (let i = 0; i < total; i++) {
          const bet = await contract.getBetInfo(i);
          betsList.push({
            id: i,
            author: bet.author,
            title: bet.title,
            description: bet.description,
            imageUrl: bet.imageUrl,
            balance: Number(bet.balance),
            active: bet.active,
          });
        }
        setBets(betsList.reverse()); // mais recentes primeiro
      } catch (err) {
        console.error("Erro ao carregar apostas:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBets();
  }, [contract]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center px-6 py-10">
      <header className="w-full flex justify-between items-center max-w-6xl mb-10">
        <h1 className="text-3xl font-bold tracking-wide">🏆 BetChain</h1>
        {account ? (
          <span className="text-sm bg-gray-800 px-4 py-2 rounded-xl">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
        ) : (
          <button
            onClick={connectWallet}
            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm font-semibold"
          >
            Connect Wallet
          </button>
        )}
      </header>

      <div className="w-full max-w-6xl flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Active Bets</h2>
        <button
          onClick={() => navigate("/create")}
          className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl text-sm font-semibold"
        >
          + Create Bet
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 mt-10">Loading bets...</p>
      ) : bets.length === 0 ? (
        <p className="text-gray-400 mt-10">No bets found yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
          {bets.map((bet) => (
            <div
              key={bet.id}
              className="bg-gray-900 p-5 rounded-2xl shadow-md hover:shadow-indigo-600/30 transition cursor-pointer"
              onClick={() => navigate(`/bet/${bet.id}`)}
            >
              {bet.imageUrl && (
                <img
                  src={bet.imageUrl}
                  alt={bet.title}
                  className="w-full h-40 object-cover rounded-xl mb-3"
                />
              )}
              <h3 className="text-lg font-semibold mb-1">{bet.title}</h3>
              <p className="text-sm text-gray-400 mb-2 line-clamp-2">{bet.description}</p>
              <div className="flex justify-between items-center mt-3 text-sm text-gray-300">
                <span>{bet.active ? "🟢 Active" : "🔴 Closed"}</span>
                <span className="text-indigo-400">
                  Balance: {ethers.formatEther(bet.balance)} ETH
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
