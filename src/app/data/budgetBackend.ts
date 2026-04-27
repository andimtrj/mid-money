import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type {
	Category,
	FixedExpense,
	FixedIncome,
	Transaction,
	Wallet,
} from "../components/types";

export type BudgetSnapshot = {
	name: string | null;
	wallet: Wallet;
	categories: Category[];
	transactions: Transaction[];
	fixedIncomes: FixedIncome[];
	fixedExpenses: FixedExpense[];
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
	addFixedIncome: (income: Omit<FixedIncome, "id">) => Promise<void>;
	updateFixedIncome: (id: string, patch: Partial<Omit<FixedIncome, "id">>) => Promise<void>;
	deleteFixedIncome: (id: string) => Promise<void>;
	addFixedExpense: (expense: Omit<FixedExpense, "id">) => Promise<void>;
	updateFixedExpense: (id: string, patch: Partial<Omit<FixedExpense, "id">>) => Promise<void>;
	deleteFixedExpense: (id: string) => Promise<void>;
	applyCycles: () => Promise<void>;
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

function mapFixedIncome(row: any): FixedIncome {
	return {
		id: row.id,
		categoryId: row.category_id,
		amount: row.amount,
		dayOfMonth: row.day_of_month,
	};
}

function mapFixedExpense(row: any): FixedExpense {
	return {
		id: row.id,
		categoryId: row.category_id,
		amount: row.amount,
		fixedIncomeId: row.fixed_income_id,
	};
}

function mapTransaction(row: any): Transaction {
	return {
		id: row.id,
		type: row.type,
		amount: row.amount,
		categoryId: row.category_id,
		note: row.note ?? "",
		date: new Date(row.occurred_at).getTime(),
		fixed: Boolean(row.fixed_source_id),
		fixedSourceId: row.fixed_source_id ?? undefined,
		fixedCycleKey: row.fixed_cycle_key ?? undefined,
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
			addFixedIncome: async () => undefined,
			updateFixedIncome: async () => undefined,
			deleteFixedIncome: async () => undefined,
			addFixedExpense: async () => undefined,
			updateFixedExpense: async () => undefined,
			deleteFixedExpense: async () => undefined,
			applyCycles: async () => undefined,
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
			await client.rpc("apply_cycles");

			const [
				profileRes,
				walletRes,
				categoriesRes,
				txRes,
				fixedIncomesRes,
				fixedExpensesRes,
			] = await Promise.all([
				client.from("profiles").select("username").eq("id", userId).maybeSingle(),
				client
					.from("wallets")
					.select("active,investment")
					.eq("user_id", userId)
					.maybeSingle(),
				client.from("categories").select("id,name,type").eq("user_id", userId),
				client
					.from("transactions")
					.select(
						"id,type,amount,category_id,note,occurred_at,fixed_source_id,fixed_cycle_key",
					)
					.eq("user_id", userId)
					.order("occurred_at", { ascending: false }),
				client
					.from("fixed_incomes")
					.select("id,category_id,amount,day_of_month")
					.eq("user_id", userId),
				client
					.from("fixed_expenses")
					.select("id,category_id,amount,fixed_income_id")
					.eq("user_id", userId),
			]);

			if (profileRes.error) throw profileRes.error;
			if (walletRes.error) throw walletRes.error;
			if (categoriesRes.error) throw categoriesRes.error;
			if (txRes.error) throw txRes.error;
			if (fixedIncomesRes.error) throw fixedIncomesRes.error;
			if (fixedExpensesRes.error) throw fixedExpensesRes.error;

			return {
				name: profileRes.data?.username ?? null,
				wallet: {
					active: walletRes.data?.active ?? 0,
					investment: walletRes.data?.investment ?? 0,
				},
				categories: (categoriesRes.data ?? []).map(mapCategory),
				transactions: (txRes.data ?? []).map(mapTransaction),
				fixedIncomes: (fixedIncomesRes.data ?? []).map(mapFixedIncome),
				fixedExpenses: (fixedExpensesRes.data ?? []).map(mapFixedExpense),
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
				.update({ active: wallet.active, investment: wallet.investment })
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
				category_id: transaction.categoryId,
				type: transaction.type,
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
		addFixedIncome: async (income) => {
			const userId = await getUserId(client);
			const { error } = await client.from("fixed_incomes").insert({
				user_id: userId,
				category_id: income.categoryId,
				amount: income.amount,
				day_of_month: income.dayOfMonth,
			});
			if (error) throw error;
		},
		updateFixedIncome: async (id, patch) => {
			const row: Record<string, unknown> = {};
			if (patch.categoryId != null) row.category_id = patch.categoryId;
			if (patch.amount != null) row.amount = patch.amount;
			if (patch.dayOfMonth != null) row.day_of_month = patch.dayOfMonth;
			if (Object.keys(row).length === 0) return;
			const { error } = await client.from("fixed_incomes").update(row).eq("id", id);
			if (error) throw error;
		},
		deleteFixedIncome: async (id) => {
			const { error } = await client.from("fixed_incomes").delete().eq("id", id);
			if (error) throw error;
		},
		addFixedExpense: async (expense) => {
			const userId = await getUserId(client);
			const { error } = await client.from("fixed_expenses").insert({
				user_id: userId,
				category_id: expense.categoryId,
				amount: expense.amount,
				fixed_income_id: expense.fixedIncomeId,
			});
			if (error) throw error;
		},
		updateFixedExpense: async (id, patch) => {
			const row: Record<string, unknown> = {};
			if (patch.categoryId != null) row.category_id = patch.categoryId;
			if (patch.amount != null) row.amount = patch.amount;
			if (patch.fixedIncomeId != null) row.fixed_income_id = patch.fixedIncomeId;
			if (Object.keys(row).length === 0) return;
			const { error } = await client.from("fixed_expenses").update(row).eq("id", id);
			if (error) throw error;
		},
		deleteFixedExpense: async (id) => {
			const { error } = await client.from("fixed_expenses").delete().eq("id", id);
			if (error) throw error;
		},
		applyCycles: async () => {
			const { error } = await client.rpc("apply_cycles");
			if (error) throw error;
		},
	};
}
