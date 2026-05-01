export type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
};

export type Pocket = {
  id: string;
  name: string;
  balance: number;
  isInvestment: boolean;
};

export type TransactionTransferDirection = "to-pocket" | "from-pocket";

export type Transaction = {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  categoryId?: string; // for income only
  pocketId?: string; // for expense: which pocket is used; for transfer: target/source pocket
  transferDirection?: TransactionTransferDirection;
  note: string;
  date: number;
};

export type Wallet = {
  active: number;
};

export const formatIDR = (n: number) => {
  return "Rp " + Math.abs(n).toLocaleString("id-ID");
}
