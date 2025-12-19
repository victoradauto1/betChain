export const mockBets = [
  {
    id: 1,
    creator: "0x123...abc",
    title: "Champions League Winner",
    description: "Who will win the Champions League?",
    imageUrl: "/images/stadiumBet.png",
    totalPool: "2.5",
    active: true,
    finalized: false,
    deadline: Date.now() / 1000 + 86400,
    options: [
      { name: "Real Madrid", amount: "1.5" },
      { name: "Manchester City", amount: "1.0" },
    ],
  },
];
