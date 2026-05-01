import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type {
	Category,
	Pocket,
	Transaction,
	Wallet,
} from "../components/types";

export type BudgetSnapshot = {
	name: string | null;
	wallet: Wallet;
	categories: Category[];
	transactions: Transaction[];
	pockets: Pocket[];
};

type TransactionPatch = Partial<Pick<Transaction, "amount" | "date" | "note">>;

export type BudgetBackend = {
	isConfigured: boolean;
	getSession: () => Promise<Session | null>;
	onAuthStateChange: (
		callback: (event: string, session: Session | null) => void,
	) => { unsubscribe: () => void };
	signInWithPassword: (params: {
		email: string;
		password: string;
	}) => Promise<{ session: Session | null }>;
	signUpWithPassword: (params: {
		email: string;
		password: string;
		username: string;
	}) => Promise<{ session: Session | null; needsConfirmation: boolean }>;
	signOut: () => Promise<void>;
	loadSnapshot: () => Promise<BudgetSnapshot | null>;
	setName: (name: string | null) => Promise<void>;
	updateWallet: (wallet: Wallet) => Promise<void>;
	addCategory: (category: Omit<Category, "id">) => Promise<void>;
	deleteCategory: (id: string) => Promise<void>;
	addTransaction: (transaction: Omit<Transaction, "id" | "date">) => Promise<void>;
	updateTransaction: (id: string, patch: TransactionPatch) => Promise<void>;
	deleteTransaction: (id: string) => Promise<void>;
	addPocket: (pocket: Omit<Pocket, "id">) => Promise<void>;
	updatePocket: (id: string, patch: Partial<Omit<Pocket, "id">>) => Promise<void>;
	deletePocket: (id: string) => Promise<void>;
	transferToPocket: (pocketId: string, amount: number) => Promise<void>;
	transferFromPocket: (pocketId: string, amount: number) => Promise<void>;
};

function must<T>(value: T | null, message: string): T {
	if (value == null) {
		throw new Error(message);
	}
	return value;
}

async function getUserId(client: SupabaseClient): Promise<string> {
	const { data, error } = await client.auth.getUser();
	if (error) throw error;
	return must(data.user?.id ?? null, "No authenticated user");
}

function toIso(timestamp: number) {
	return new Date(timestamp).toISOString();
}

function mapCategory(row: any): Category {
	return {
		id: row.id,
		name: row.name,
		type: row.type,
	};
}

function mapPocket(row: any): Pocket {
	return {
		id: row.id,
		name: row.name,
		balance: row.balance,
		isInvestment: row.is_investment,
	};
}

function mapTransaction(row: any): Transaction {
	return {
		id: row.id,
		type: row.type,
		amount: row.amount,
		categoryId: row.category_id ?? undefined,
		pocketId: row.pocket_id ?? undefined,
		note: row.note ?? "",
		date: new Date(row.occurred_at).getTime(),
	};
}

export function createBudgetBackendFromEnv(): BudgetBackend {
	const url = import.meta.env.VITE_SUPABASE_URL;
	const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
	if (!url || !anonKey) {
		return {
			isConfigured: false,
			getSession: async () => null,
			onAuthStateChange: () => ({ unsubscribe: () => undefined }),
			signInWithPassword: async () => ({ session: null }),
			signUpWithPassword: async () => ({ session: null, needsConfirmation: true }),
			signOut: async () => undefined,
			loadSnapshot: async () => null,
			setName: async () => undefined,
			updateWallet: async () => undefined,
			addCategory: async () => undefined,
			deleteCategory: async () => undefined,
			addTransaction: async () => undefined,
			updateTransaction: async () => undefined,
			deleteTransaction: async () => undefined,
			addPocket: async () => undefined,
			updatePocket: async () => undefined,
			deletePocket: async () => undefined,
			transferToPocket: async () => undefined,
			transferFromPocket: async () => undefined,
		};
	}

	const client = createClient(url, anonKey);

	return {
		isConfigured: true,
		getSession: async () => {
			const { data, error } = await client.auth.getSession();
			if (error) throw error;
			return data.session ?? null;
		},
		onAuthStateChange: (callback) => {
			const { data } = client.auth.onAuthStateChange((event, session) => {
				callback(event, session);
			});
			return {
				unsubscribe: () => data.subscription.unsubscribe(),
			};
		},
		signInWithPassword: async ({ email, password }) => {
			const { data, error } = await client.auth.signInWithPassword({
				email,
				password,
			});
			if (error) throw error;
			return { session: data.session ?? null };
		},
		signUpWithPassword: async ({ email, password, username }) => {
			const { data, error } = await client.auth.signUp({
				email,
				password,
				options: { data: { username } },
			});
			if (error) throw error;
			return {
				session: data.session ?? null,
				needsConfirmation: data.session == null,
			};
		},
		signOut: async () => {
			const { error } = await client.auth.signOut();
			if (error) throw error;
		},
		loadSnapshot: async () => {
			const userId = await getUserId(client);

			const [
				profileRes,
				walletRes,
				categoriesRes,
				pocketsRes,
				txRes,
			] = await Promise.all([
				client.from("profiles").select("username").eq("id", userId).maybeSingle(),
				client
					.from("wallets")
					.select("active")
					.eq("user_id", userId)
					.maybeSingle(),
				client.from("categories").select("id,name,type").eq("user_id", userId),
				client.from("pockets").select("id,name,balance,is_investment").eq("user_id", userId),
				client
					.from("transactions")
					.select("id,type,amount,category_id,pocket_id,note,occurred_at")
					.eq("user_id", userId)
					.order("occurred_at", { ascending: false }),
			]);

			if (profileRes.error) throw profileRes.error;
			if (walletRes.error) throw walletRes.error;
			if (categoriesRes.error) throw categoriesRes.error;
			if (pocketsRes.error) throw pocketsRes.error;
			if (txRes.error) throw txRes.error;

			return {
				name: profileRes.data?.username ?? null,
				wallet: {
					active: walletRes.data?.active ?? 0,
				},
				categories: (categoriesRes.data ?? []).map(mapCategory),
				pockets: (pocketsRes.data ?? []).map(mapPocket),
				transactions: (txRes.data ?? []).map(mapTransaction),
			};
		},
		setName: async (name) => {
			if (!name) return;
			const userId = await getUserId(client);
			const { error } = await client
				.from("profiles")
				.update({ username: name })
				.eq("id", userId);
			if (error) throw error;
		},
		updateWallet: async (wallet) => {
			const userId = await getUserId(client);
			const { error } = await client
				.from("wallets")
				.update({ active: wallet.active })
				.eq("user_id", userId);
			if (error) throw error;
		},
		addCategory: async (category) => {
			const userId = await getUserId(client);
			const { error } = await client.from("categories").insert({
				user_id: userId,
				name: category.name,
				type: category.type,
			});
			if (error) throw error;
		},
		deleteCategory: async (id) => {
			const { error } = await client.from("categories").delete().eq("id", id);
			if (error) throw error;
		},
		addTransaction: async (transaction) => {
			const userId = await getUserId(client);
			const { error } = await client.from("transactions").insert({
				user_id: userId,
				type: transaction.type,
				category_id: transaction.categoryId ?? null,
				pocket_id: transaction.pocketId ?? null,
				amount: transaction.amount,
				note: transaction.note,
				occurred_at: toIso(Date.now()),
			});
			if (error) throw error;
		},
		updateTransaction: async (id, patch) => {
			const row: Record<string, unknown> = {};
			if (patch.amount != null) row.amount = patch.amount;
			if (patch.note != null) row.note = patch.note;
			if (patch.date != null) row.occurred_at = toIso(patch.date);
			if (Object.keys(row).length === 0) return;
			const { error } = await client.from("transactions").update(row).eq("id", id);
			if (error) throw error;
		},
		deleteTransaction: async (id) => {
			const { error } = await client.from("transactions").delete().eq("id", id);
			if (error) throw error;
		},
		addPocket: async (pocket) => {
			const userId = await getUserId(client);
			const { error } = await client.from("pockets").insert({
				user_id: userId,
				name: pocket.name,
				balance: pocket.balance,
				is_investment: pocket.isInvestment,
			});
			if (error) throw error;
		},
		updatePocket: async (id, patch) => {
			const row: Record<string, unknown> = {};
			if (patch.name != null) row.name = patch.name;
			if (patch.balance != null) row.balance = patch.balance;
			if (patch.isInvestment != null) row.is_investment = patch.isInvestment;
			if (Object.keys(row).length === 0) return;
			const { error } = await client.from("pockets").update(row).eq("id", id);
			if (error) throw error;
		},
		deletePocket: async (id) => {
			const { error } = await client.from("pockets").delete().eq("id", id);
			if (error) throw error;
		},
		transferToPocket: async (pocketId, amount) => {
			const userId = await getUserId(client);
			
			// Deduct from wallet
			const { error: walletError } = await client
				.from("wallets")
				.update({ active: (row) => `${row}.active - ${amount}` })
				.eq("user_id", userId);
			if (walletError) throw walletError;

			// Add to pocket
			const { error: pocketError } = await client
				.from("pockets")
				.update({ balance: (row) => `${row}.balance + ${amount}` })
				.eq("id", pocketId);
			if (pocketError) throw pocketError;
		},
		transferFromPocket: async (pocketId, amount) => {
			const userId = await getUserId(client);

			// Add to wallet
			const { error: walletError } = await client
				.from("wallets")
				.update({ active: (row) => `${row}.active + ${amount}` })
				.eq("user_id", userId);
			if (walletError) throw walletError;

			// Deduct from pocket
			const { error: pocketError } = await client
				.from("pockets")
				.update({ balance: (row) => `${row}.balance - ${amount}` })
				.eq("id", pocketId);
			if (pocketError) throw pocketError;
		},
	};
}
