"use client"

import { useState, useEffect } from "react"
import { Save, Lock, Plus, X, FileText, TrendingDown, TrendingUp } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"
import { formatBRL, formatPerc, calcularCMV } from "@/lib/utils"
import { T } from "@/lib/design-tokens"

export function OutrosCustosDRE({ data, dataInicio, dataFim, onChange, onPerfilRefresh, isReadOnly, perfil, produtos, contagemInicial, contagemFinal }: any) {
  const categoriasEmpresa: string[] = perfil?.empresa?.categorias_custos || ["Embalagens", "Material de Limpeza", "Gás", "Descartáveis"]

  const [valores, setValores] = useState<Record<string, string>>({})
  const [novaCategoria, setNovaCategoria] = useState("")
  const [adicionando, setAdicionando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    const persistidos = data?.outrosCustos?.outros_custos || {}
    const inicial: Record<string, string> = {}
    categoriasEmpresa.forEach(cat => {
      inicial[cat] = persistidos[cat] !== undefined ? String(persistidos[cat]) : "0"
    })
    setValores(inicial)
  }, [data, perfil])

  const parseValor = (v: string) => parseFloat(String(v).replace(',', '.')) || 0

  const handleSalvar = async () => {
    if (isReadOnly) return toast.error("Este período já foi encerrado. Edições bloqueadas.")
    setSalvando(true)

    const payload: Record<string, number> = {}
    Object.entries(valores).forEach(([cat, val]) => { payload[cat] = parseValor(val) })

    const { error } = await supabase.from('financas_semanais')
      .upsert({ empresa_id: perfil?.empresa_id, data_inicio: dataInicio, data_fim: dataFim, outros_custos: payload }, { onConflict: 'empresa_id,data_inicio' })

    setSalvando(false)
    if (error) toast.error("Erro ao salvar custos.")
    else { toast.success("Custos atualizados!"); onChange() }
  }

  const handleAdicionarCategoria = async () => {
    const nome = novaCategoria.trim()
    if (!nome) return toast.error("Digite o nome da categoria!")
    if (categoriasEmpresa.includes(nome)) return toast.error("Categoria já existe!")

    const novas = [...categoriasEmpresa, nome]
    const { error } = await supabase.from('empresas').update({ categorias_custos: novas }).eq('id', perfil.empresa_id)
    if (error) return toast.error("Erro ao adicionar categoria.")

    setNovaCategoria("")
    setAdicionando(false)
    toast.success(`Categoria "${nome}" adicionada!`)
    onPerfilRefresh?.()
  }

  const handleRemoverCategoria = async (cat: string) => {
    if (!confirm(`Remover a categoria "${cat}"? Os valores históricos serão preservados no banco.`)) return
    const novas = categoriasEmpresa.filter(c => c !== cat)
    const { error } = await supabase.from('empresas').update({ categorias_custos: novas }).eq('id', perfil.empresa_id)
    if (error) return toast.error("Erro ao remover categoria.")
    toast.success("Categoria removida.")
    onPerfilRefresh?.()
  }

  const cmvCalc = calcularCMV({ lancamentos: data, contagemInicial, contagemFinal, produtos })

  const totalOutrosCustos = Object.values(valores).reduce((a, v) => a + parseValor(v), 0)
  const margemBruta       = cmvCalc.faturamento - cmvCalc.cmv
  const margemBrutaPerc   = cmvCalc.faturamento > 0 ? (margemBruta / cmvCalc.faturamento) * 100 : 0
  const resultado         = margemBruta - totalOutrosCustos
  const resultadoPerc     = cmvCalc.faturamento > 0 ? (resultado / cmvCalc.faturamento) * 100 : 0
  const outrosPerc        = cmvCalc.faturamento > 0 ? (totalOutrosCustos / cmvCalc.faturamento) * 100 : 0

  const di = dataInicio?.split('-').reverse().join('/')
  const df = dataFim?.split('-').reverse().join('/')

  return (
    <div className="space-y-4 pb-10">

      {/* Eyebrow + Título */}
      <div>
        <p className="text-[12px] font-semibold uppercase mb-1"
          style={{ color: T.stone400, letterSpacing: '0.10em' }}>
          {perfil?.empresa?.nome || "Operacional"} · {di} → {df}
        </p>
        <h1 className="text-[28px] font-serif" style={{ color: T.ink }}>
          Despesas & Resultado
        </h1>
      </div>

      {/* Banner período encerrado */}
      {isReadOnly && (
        <div className="flex items-center gap-3 py-2.5"
          style={{ borderBottom: `1px solid ${T.stone200}` }}>
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: T.warning }} />
          <p className="text-[14px] font-medium" style={{ color: T.ink }}>
            Modo visualização — este período já foi encerrado.
          </p>
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-semibold"
            style={{ backgroundColor: T.warnSoft, color: T.warning }}>
            <Lock className="w-3 h-3" strokeWidth={2} />
            Protegido
          </span>
        </div>
      )}

      {/* KPI Strip */}
      <div className="bg-white rounded-xl overflow-hidden"
        style={{ border: `1px solid ${T.stone200}` }}>
        <div className="flex flex-wrap divide-y sm:divide-y-0">

          {/* Faturamento */}
          <div className="flex-1 min-w-[160px] py-5 px-5"
            style={{ borderRight: `1px solid ${T.stone200}` }}>
            <p className="text-[12px] font-semibold uppercase mb-2"
              style={{ color: T.stone400, letterSpacing: '0.08em' }}>Faturamento Bruto</p>
            <p className="text-[32px] font-light font-serif tabular-nums leading-none"
              style={{ color: cmvCalc.faturamento > 0 ? T.positive : T.stone300 }}>
              {formatBRL(cmvCalc.faturamento)}
            </p>
          </div>

          {/* Outros custos */}
          <div className="flex-1 min-w-[160px] py-5 px-5"
            style={{ borderRight: `1px solid ${T.stone200}` }}>
            <p className="text-[12px] font-semibold uppercase mb-2"
              style={{ color: T.stone400, letterSpacing: '0.08em' }}>Outros Custos</p>
            <p className="text-[32px] font-light font-serif tabular-nums leading-none"
              style={{ color: totalOutrosCustos > 0 ? T.negative : T.stone300 }}>
              {formatBRL(totalOutrosCustos)}
            </p>
          </div>

          {/* % do faturamento */}
          <div className="flex-1 min-w-[140px] py-5 px-5">
            <p className="text-[12px] font-semibold uppercase mb-2"
              style={{ color: T.stone400, letterSpacing: '0.08em' }}>% do Faturamento</p>
            <p className="text-[32px] font-light font-serif tabular-nums leading-none"
              style={{ color: outrosPerc > 0 ? T.ink : T.stone300 }}>
              {cmvCalc.faturamento > 0 ? formatPerc(outrosPerc) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Linha principal: Despesas + DRE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Despesas da semana */}
        <div className="lg:col-span-2 bg-white rounded-xl border"
          style={{ borderColor: T.stone200 }}>

          <div className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${T.stone200}` }}>
            <div>
              <p className="text-[12px] font-semibold uppercase"
                style={{ color: T.stone400, letterSpacing: '0.08em' }}>Operacional</p>
              <h3 className="text-[16px] font-medium mt-0.5" style={{ color: T.ink }}>Despesas da Semana</h3>
            </div>
            <div className="flex items-center gap-2">
              {!isReadOnly && !adicionando && (
                <button onClick={() => setAdicionando(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all duration-150"
                  style={{ color: T.ink, borderColor: T.stone200, backgroundColor: 'white' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = T.paper2}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Nova categoria
                </button>
              )}
              {!isReadOnly && (
                <button onClick={handleSalvar} disabled={salvando}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[14px] font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
                  style={{ backgroundColor: T.ink, color: T.paper }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.ink2)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = T.ink)}>
                  <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {adicionando && (
              <div className="mb-5 flex gap-2 items-center p-4 rounded-xl border"
                style={{ backgroundColor: T.paper2, borderColor: T.stone200 }}>
                <input
                  type="text" autoFocus
                  value={novaCategoria}
                  onChange={e => setNovaCategoria(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdicionarCategoria()}
                  placeholder="Ex: Aluguel, Folha, Gás..."
                  className="flex-1 px-3 py-2 border rounded-lg text-[14px] font-medium outline-none bg-white transition-all duration-150"
                  style={{ borderColor: T.stone200, color: T.ink }}
                />
                <button onClick={handleAdicionarCategoria}
                  className="px-4 py-2 rounded-lg text-[14px] font-semibold transition-all duration-150"
                  style={{ backgroundColor: T.ink, color: T.paper }}>
                  Adicionar
                </button>
                <button onClick={() => { setAdicionando(false); setNovaCategoria("") }}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: T.stone400 }}
                  onMouseEnter={e => e.currentTarget.style.color = T.negative}
                  onMouseLeave={e => e.currentTarget.style.color = T.stone400}>
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            )}

            {categoriasEmpresa.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[14px]" style={{ color: T.stone400 }}>
                  Nenhuma categoria cadastrada ainda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoriasEmpresa.map(cat => (
                  <div key={cat} className="space-y-1.5 group relative">
                    <label className="text-[12px] font-semibold uppercase flex items-center justify-between"
                      style={{ color: T.stone400, letterSpacing: '0.08em' }}>
                      <span>{cat}</span>
                      {!isReadOnly && (
                        <button onClick={() => handleRemoverCategoria(cat)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: T.stone300 }}
                          onMouseEnter={e => e.currentTarget.style.color = T.negative}
                          onMouseLeave={e => e.currentTarget.style.color = T.stone300}>
                          <X className="w-3 h-3" strokeWidth={2} />
                        </button>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-medium"
                        style={{ color: T.stone400 }}>R$</span>
                      <input
                        type="text" disabled={isReadOnly}
                        value={valores[cat] || "0"}
                        onChange={e => setValores({ ...valores, [cat]: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 border rounded-xl text-[14px] font-semibold outline-none transition-all duration-150 disabled:cursor-not-allowed"
                        style={{
                          borderColor: T.stone200,
                          color: T.ink,
                          backgroundColor: isReadOnly ? T.paper2 : T.paper2,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DRE Simplificada */}
        <div className="bg-white rounded-xl border overflow-hidden"
          style={{ borderColor: T.stone200 }}>

          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.stone200}` }}>
            <p className="text-[12px] font-semibold uppercase"
              style={{ color: T.stone400, letterSpacing: '0.08em' }}>Demonstrativo</p>
            <h3 className="text-[16px] font-medium mt-0.5" style={{ color: T.ink }}>DRE Simplificada</h3>
          </div>

          <div className="p-5 space-y-0">
            {/* Receita Bruta */}
            <div className="flex justify-between items-center py-3"
              style={{ borderBottom: `1px solid ${T.stone200}` }}>
              <span className="text-[14px]" style={{ color: T.stone500 }}>(=) Receita Bruta</span>
              <div className="text-right">
                <span className="text-[14px] font-semibold tabular-nums" style={{ color: T.positive }}>
                  {formatBRL(cmvCalc.faturamento)}
                </span>
                <span className="block text-[12px] font-semibold" style={{ color: T.stone400 }}>100,00%</span>
              </div>
            </div>

            {/* CMV */}
            <div className="flex justify-between items-center py-3"
              style={{ borderBottom: `1px solid ${T.stone200}` }}>
              <span className="text-[14px] pl-3" style={{ color: T.stone500 }}>(-) CMV</span>
              <div className="text-right">
                <span className="text-[14px] font-semibold tabular-nums" style={{ color: T.negative }}>
                  {formatBRL(cmvCalc.cmv)}
                </span>
                <span className="block text-[12px] font-semibold" style={{ color: T.stone400 }}>
                  {formatPerc(cmvCalc.margemCMV)}
                </span>
              </div>
            </div>

            {/* Margem Bruta */}
            <div className="flex justify-between items-center py-3.5"
              style={{ borderBottom: `1px solid ${T.stone200}`, backgroundColor: margemBruta >= 0 ? T.posSoft : T.negSoft, margin: '0 -20px', padding: '12px 20px' }}>
              <span className="text-[14px] font-semibold" style={{ color: T.ink }}>(=) Margem Bruta</span>
              <div className="text-right">
                <span className="text-[15px] font-semibold tabular-nums"
                  style={{ color: margemBruta >= 0 ? T.positive : T.negative }}>
                  {formatBRL(margemBruta)}
                </span>
                <span className="block text-[12px] font-semibold"
                  style={{ color: margemBruta >= 0 ? T.positive : T.negative }}>
                  {formatPerc(margemBrutaPerc)}
                </span>
              </div>
            </div>

            {/* Outros custos */}
            <div className="flex justify-between items-center py-3"
              style={{ borderBottom: `1px solid ${T.stone200}` }}>
              <span className="text-[14px] pl-3" style={{ color: T.stone500 }}>(-) Outros Custos</span>
              <div className="text-right">
                <span className="text-[14px] font-semibold tabular-nums" style={{ color: T.negative }}>
                  {formatBRL(totalOutrosCustos)}
                </span>
                <span className="block text-[12px] font-semibold" style={{ color: T.stone400 }}>
                  {formatPerc(outrosPerc)}
                </span>
              </div>
            </div>

            {/* Resultado Líquido */}
            <div className="flex justify-between items-center pt-4 pb-2">
              <div className="flex items-center gap-2">
                {resultado >= 0
                  ? <TrendingUp className="w-4 h-4" strokeWidth={1.5} style={{ color: T.positive }} />
                  : <TrendingDown className="w-4 h-4" strokeWidth={1.5} style={{ color: T.negative }} />
                }
                <span className="text-[14px] font-semibold" style={{ color: T.ink }}>Resultado Líquido</span>
              </div>
              <div className="text-right">
                <span className="text-[22px] font-light font-serif tabular-nums"
                  style={{ color: resultado >= 0 ? T.positive : T.negative }}>
                  {formatBRL(resultado)}
                </span>
                <span className="block text-[12px] font-semibold"
                  style={{ color: resultado >= 0 ? T.positive : T.negative }}>
                  {formatPerc(resultadoPerc)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DRE expandida */}
      <div className="bg-white rounded-xl border overflow-hidden"
        style={{ borderColor: T.stone200 }}>
        <div className="px-6 py-4 flex items-center gap-2"
          style={{ borderBottom: `1px solid ${T.stone200}` }}>
          <FileText className="w-4 h-4" strokeWidth={1.5} style={{ color: T.stone400 }} />
          <div>
            <p className="text-[12px] font-semibold uppercase"
              style={{ color: T.stone400, letterSpacing: '0.08em' }}>Análise</p>
            <h3 className="text-[16px] font-medium" style={{ color: T.ink }}>DRE Completa da Semana</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: T.paper, borderBottom: `1px solid ${T.stone200}` }}>
                <th className="py-3 px-6 text-left text-[12px] font-semibold uppercase"
                  style={{ color: T.stone400, letterSpacing: '0.08em' }}>Linha</th>
                <th className="py-3 px-6 text-right text-[12px] font-semibold uppercase"
                  style={{ color: T.stone400, letterSpacing: '0.08em' }}>Valor</th>
                <th className="py-3 px-6 text-right text-[12px] font-semibold uppercase"
                  style={{ color: T.stone400, letterSpacing: '0.08em' }}>% Fat.</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "(=) Receita Bruta",          value: cmvCalc.faturamento,   perc: 100,             indent: false, colorValue: T.positive, bold: false },
                { label: "(-) CMV (Custo dos Insumos)", value: -cmvCalc.cmv,          perc: cmvCalc.margemCMV, indent: true, colorValue: T.negative, bold: false },
                { label: "(=) Margem Bruta",            value: margemBruta,           perc: margemBrutaPerc, indent: false, colorValue: margemBruta >= 0 ? T.positive : T.negative, bold: true },
                { label: "(-) Outros Custos Op.",       value: -totalOutrosCustos,    perc: outrosPerc,      indent: true, colorValue: T.negative, bold: false },
                { label: "(=) Resultado Líquido",       value: resultado,             perc: resultadoPerc,   indent: false, colorValue: resultado >= 0 ? T.positive : T.negative, bold: true },
              ].map(({ label, value, perc, indent, colorValue, bold }) => (
                <tr key={label} className="group transition-colors"
                  style={{ borderBottom: `1px solid ${T.stone200}` }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = T.paper2)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <td className={`py-3.5 px-6 text-[14px] ${indent ? 'pl-10' : ''}`}
                    style={{ color: bold ? T.ink : T.stone500, fontWeight: bold ? 600 : 400 }}>
                    {label}
                  </td>
                  <td className="py-3.5 px-6 text-right text-[14px] tabular-nums"
                    style={{ color: colorValue, fontWeight: bold ? 600 : 500 }}>
                    {formatBRL(Math.abs(value))}
                  </td>
                  <td className="py-3.5 px-6 text-right text-[12px] tabular-nums"
                    style={{ color: T.stone400 }}>
                    {formatPerc(Math.abs(perc))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 flex items-start gap-3" style={{ borderTop: `1px solid ${T.stone200}`, backgroundColor: T.paper }}>
          <p className="text-[12px] leading-relaxed" style={{ color: T.stone500 }}>
            <span className="font-semibold" style={{ color: T.ink }}>Margem Bruta</span> = Faturamento − CMV.
            É o que sobra para pagar custos operacionais.{' '}
            <span className="font-semibold" style={{ color: T.ink }}>Resultado Líquido</span> = Margem Bruta − Outros Custos.
            Lucro real da semana antes de impostos.
          </p>
        </div>
      </div>
    </div>
  )
}
