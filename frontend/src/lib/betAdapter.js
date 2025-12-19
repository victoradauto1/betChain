import { ethers } from "ethers";

export function mapBetFromContract(raw) {
  return {
    id: Number(raw.id),
    creator: raw.creator,
    title: raw.title,
    description: raw.description,
    imageUrl: raw.imageUrl,
    totalPool: ethers.formatEther(raw.totalPool),
    active: raw.active,
    finalized: raw.finalized,
    deadline: Number(raw.deadline),
    options: raw.options.map((opt, i) => ({
      name: opt.name,
      amount: ethers.formatEther(opt.amount),
    })),
  };
}
