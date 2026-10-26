import { randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para criar os atletas fictícios.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const athletes = Array.from({ length: 10 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");

  return {
    email: `ranking-smash.feminino.${number}@example.com`,
    name: `Atleta Teste Feminino ${number}`,
  };
});

async function findUsersByEmail() {
  const usersByEmail = new Map();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Não foi possível consultar usuários existentes: ${error.message}`);

    for (const user of data.users) {
      if (athletes.some((athlete) => athlete.email === user.email)) {
        usersByEmail.set(user.email, user);
      }
    }

    if (data.users.length < perPage) return usersByEmail;
    page += 1;
  }
}

async function createOrUpdateAthlete(athlete, existingUser) {
  let user = existingUser;

  if (user && user.app_metadata?.demo_user !== true) {
    throw new Error(
      `O e-mail ${athlete.email} já pertence a uma conta não identificada como fictícia; nenhuma alteração foi feita nessa conta.`,
    );
  }

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: athlete.email,
      password: randomBytes(32).toString("hex"),
      email_confirm: true,
      user_metadata: {
        full_name: athlete.name,
        class_number: 7,
        role: "athlete",
        athlete_status: "active",
      },
      app_metadata: { demo_user: true },
    });

    if (error) throw new Error(`Não foi possível criar ${athlete.email}: ${error.message}`);
    user = data.user;
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: athlete.name,
    },
    { onConflict: "id" },
  );
  if (profileError) {
    throw new Error(`Não foi possível salvar o perfil de ${athlete.email}: ${profileError.message}`);
  }

  const { error: athleteError } = await supabase.from("athletes").upsert(
    {
      user_id: user.id,
      current_class: 7,
      status: "active",
    },
    { onConflict: "user_id" },
  );
  if (athleteError) {
    throw new Error(`Não foi possível associar ${athlete.email} à classe Feminino: ${athleteError.message}`);
  }
}

const existingUsers = await findUsersByEmail();
let created = 0;
let alreadyPresent = 0;

for (const athlete of athletes) {
  const existingUser = existingUsers.get(athlete.email);
  await createOrUpdateAthlete(athlete, existingUser);
  if (existingUser) alreadyPresent += 1;
  else created += 1;
}

console.info(
  `Atletas fictícias da classe Feminino concluídas: ${created} criada(s), ${alreadyPresent} já existente(s)/atualizada(s).`,
);
