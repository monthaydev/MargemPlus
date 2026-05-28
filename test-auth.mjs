/**
 * Diagnóstico rápido: testa conexão e auth com o Supabase
 */
import { createClient } from '@supabase/supabase-js'

const SUPA_URL = 'https://uuacjauoxjluoqrbbdiv.supabase.co'
const ANON_KEY = 'sb_publishable_z_H4YcwKS7RceDCO1TPVaA_kIeU8YI'
const EMAIL    = 'joao@cantinadalua.com.br'
const PASSWORD = 'Margem@2026!'

const supabase = createClient(SUPA_URL, ANON_KEY)

console.log('\n🔍 Diagnóstico Supabase\n')

// 1. Tenta login
console.log('1. Tentando signInWithPassword...')
const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
  email: EMAIL, password: PASSWORD
})

if (loginErr) {
  console.log('   ❌ Erro no login:', loginErr.message)
  console.log('   Código:', loginErr.status)
} else {
  console.log('   ✅ Login OK!')
  console.log('   User ID:', loginData.user?.id)
  console.log('   Confirmado:', loginData.user?.email_confirmed_at ? 'Sim' : 'Não')
  console.log('   Session:', loginData.session ? 'Ativa' : 'Nula')
}

// 2. Tenta signup (conta nova de teste)
console.log('\n2. Tentando signUp com conta de teste...')
const { data: signupData, error: signupErr } = await supabase.auth.signUp({
  email: 'seed-test-' + Date.now() + '@cantinadalua.com.br',
  password: 'TesteSeed@123!'
})

if (signupErr) {
  console.log('   ❌ Erro no signup:', signupErr.message)
} else {
  console.log('   ✅ Signup respondeu!')
  console.log('   Session imediata:', signupData.session ? 'Sim (email confirmation DESABILITADO)' : 'Não (email confirmation HABILITADO)')
  console.log('   User:', signupData.user?.email)
}

// 3. Checa perfil (se login funcionou)
if (loginData?.session) {
  console.log('\n3. Verificando perfil do usuário...')
  const { data: perfil, error: perfilErr } = await supabase
    .from('perfis').select('*, empresa:empresas(nome)').maybeSingle()

  if (perfilErr) {
    console.log('   ❌ Erro ao buscar perfil:', perfilErr.message)
  } else if (!perfil) {
    console.log('   ⚠️  Sem perfil (usuário existe mas empresa não foi criada)')
  } else {
    console.log('   ✅ Perfil encontrado!')
    console.log('   Nome:', perfil.nome_completo)
    console.log('   Empresa:', perfil.empresa?.nome)
  }
}

console.log('\n─────────────────────────────')
