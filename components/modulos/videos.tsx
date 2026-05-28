"use client"

import { useState, useEffect, useRef } from "react"
import { Play, X, Clock, Search, BookOpen, Monitor, ChevronRight } from "lucide-react"
import { VIDEOS, CATEGORIAS, type Categoria, type Video } from "@/lib/videos"
import { T } from "@/lib/design-tokens"

// ── Helpers ──────────────────────────────────────────────────────────────────

const thumbUrl = (id: string) =>
  id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null

const embedUrl = (id: string) =>
  `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`

// ── Sub-componentes ───────────────────────────────────────────────────────────

function ModalPlayer({ video, onClose }: { video: Video; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Fechar com ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handler)
      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: "rgba(11,13,14,0.92)", backdropFilter: "blur(12px)" }}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="w-full max-w-4xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">

        {/* Cabeçalho do modal */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: CATEGORIAS[video.categoria].label === "Como Usar o Sistema" ? "#6DC4A0" : "#FB923C" }}>
              {CATEGORIAS[video.categoria].label}
            </p>
            <h2 className="text-[20px] font-serif leading-snug" style={{ color: "#FAFAF7" }}>
              {video.titulo}
            </h2>
            {video.descricao && (
              <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: "rgba(250,250,247,0.5)" }}>
                {video.descricao}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 rounded-xl transition-all duration-150"
            style={{ color: "rgba(250,250,247,0.5)", backgroundColor: "rgba(250,250,247,0.08)" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(250,250,247,0.15)"; e.currentTarget.style.color = "#FAFAF7" }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(250,250,247,0.08)"; e.currentTarget.style.color = "rgba(250,250,247,0.5)" }}
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Player */}
        <div className="relative w-full rounded-2xl overflow-hidden"
          style={{ paddingBottom: "56.25%", backgroundColor: "#000" }}>
          {video.id ? (
            <iframe
              src={embedUrl(video.id)}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              style={{ backgroundColor: "#111" }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(250,250,247,0.08)" }}>
                <Monitor className="w-7 h-7" style={{ color: "rgba(250,250,247,0.3)" }} />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-semibold" style={{ color: "rgba(250,250,247,0.6)" }}>Em breve</p>
                <p className="text-[13px] mt-1" style={{ color: "rgba(250,250,247,0.3)" }}>Este vídeo ainda está sendo produzido.</p>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do modal */}
        <p className="text-[11px] text-center" style={{ color: "rgba(250,250,247,0.25)" }}>
          Pressione <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: "rgba(250,250,247,0.1)" }}>ESC</kbd> ou clique fora para fechar
        </p>
      </div>
    </div>
  )
}

function VideoCard({ video, destaque, onClick }: { video: Video; destaque?: boolean; onClick: () => void }) {
  const [imgError, setImgError] = useState(false)
  const thumb = thumbUrl(video.id)
  const emBreve = !video.id

  return (
    <button
      onClick={onClick}
      className={`group text-left w-full flex flex-col overflow-hidden rounded-xl border transition-all duration-200 active:scale-[0.98] ${destaque ? "md:flex-row" : ""}`}
      style={{ borderColor: T.stone200, backgroundColor: "white" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.stone400; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)" }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.stone200; e.currentTarget.style.boxShadow = "none" }}
    >
      {/* Thumbnail */}
      <div
        className={`relative flex-shrink-0 overflow-hidden ${destaque ? "md:w-56 md:h-full" : "w-full"}`}
        style={{ aspectRatio: destaque ? "auto" : "16/9", minHeight: destaque ? 140 : "auto" }}
      >
        {thumb && !imgError && !emBreve ? (
          <img
            src={thumb}
            alt={video.titulo}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: T.paper2, minHeight: 120 }}>
            {emBreve ? (
              <div className="flex flex-col items-center gap-1.5">
                <Monitor className="w-6 h-6" style={{ color: T.stone300 }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T.stone300 }}>Em breve</span>
              </div>
            ) : (
              <Play className="w-6 h-6" style={{ color: T.stone300 }} />
            )}
          </div>
        )}

        {/* Overlay de play (só quando tem vídeo) */}
        {!emBreve && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ backgroundColor: "rgba(15,23,42,0.5)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.95)" }}>
              <Play className="w-5 h-5 ml-0.5" style={{ color: "#0F172A" }} fill="#0F172A" />
            </div>
          </div>
        )}

        {/* Badge de duração */}
        {video.duracao && video.duracao !== "00:00" && !emBreve && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1"
            style={{ backgroundColor: "rgba(15,23,42,0.85)", color: "#FAFAF7" }}>
            <Clock className="w-2.5 h-2.5" />
            {video.duracao}
          </div>
        )}

        {/* Badge "Em breve" */}
        {emBreve && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[11px] font-semibold"
            style={{ backgroundColor: T.stone100, color: T.stone400 }}>
            Em breve
          </div>
        )}
      </div>

      {/* Conteúdo textual */}
      <div className={`flex flex-col flex-1 p-4 ${destaque ? "justify-center" : ""}`}>
        <h3
          className={`font-semibold leading-snug mb-1.5 ${destaque ? "text-[16px]" : "text-[14px]"}`}
          style={{ color: T.ink }}
        >
          {video.titulo}
        </h3>
        {video.descricao && (
          <p
            className={`leading-relaxed ${destaque ? "text-[13px] line-clamp-3" : "text-[12px] line-clamp-2"}`}
            style={{ color: T.stone500 }}
          >
            {video.descricao}
          </p>
        )}
        {!emBreve && destaque && (
          <div className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: T.margem }}>
            Assistir agora <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </button>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function Videos({ perfil }: { perfil: any }) {
  const [categoria, setCategoria] = useState<Categoria>("sistema")
  const [busca, setBusca] = useState("")
  const [videoAtivo, setVideoAtivo] = useState<Video | null>(null)

  const categorias: Categoria[] = ["sistema", "contabilidade"]

  const videosFiltrados = VIDEOS.filter(v => {
    if (v.categoria !== categoria) return false
    if (!busca.trim()) return true
    const q = busca.toLowerCase()
    return v.titulo.toLowerCase().includes(q) || v.descricao.toLowerCase().includes(q)
  })

  const destaques = videosFiltrados.filter(v => v.destaque)
  const restantes = videosFiltrados.filter(v => !v.destaque)

  const totalPorCategoria = (cat: Categoria) => VIDEOS.filter(v => v.categoria === cat).length
  const produzidosPorCategoria = (cat: Categoria) => VIDEOS.filter(v => v.categoria === cat && v.id).length

  return (
    <>
      {/* Modal player */}
      {videoAtivo && (
        <ModalPlayer video={videoAtivo} onClose={() => setVideoAtivo(null)} />
      )}

      <div className="space-y-6 pb-10">

        {/* ── Cabeçalho ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase mb-1"
              style={{ color: T.stone400, letterSpacing: "0.10em" }}>
              Conteúdo exclusivo
            </p>
            <h1 className="text-[28px] font-light font-serif" style={{ color: T.ink }}>
              Central de Aprendizado
            </h1>
            <p className="text-[14px] mt-1" style={{ color: T.stone500 }}>
              Tutoriais do sistema e aulas de gestão financeira para restaurantes.
            </p>
          </div>

          {/* Busca */}
          <div className="relative w-full sm:w-auto">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: T.stone400 }} />
            <input
              type="text"
              placeholder="Buscar vídeo..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-56 pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium outline-none"
              style={{ border: `1px solid ${T.stone200}`, backgroundColor: "white", color: T.ink }}
            />
          </div>
        </div>

        {/* ── Tabs de categoria ── */}
        <div className="flex border-b" style={{ borderColor: T.stone200 }}>
          {categorias.map(cat => {
            const ativa = categoria === cat
            const total = totalPorCategoria(cat)
            const prontos = produzidosPorCategoria(cat)
            const Icon = cat === "sistema" ? Monitor : BookOpen
            return (
              <button
                key={cat}
                onClick={() => { setCategoria(cat); setBusca("") }}
                className="relative flex items-center gap-2.5 px-5 py-3.5 text-[14px] font-semibold transition-all whitespace-nowrap"
                style={{ color: ativa ? T.ink : T.stone500 }}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {CATEGORIAS[cat].label}
                <span
                  className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: ativa ? T.stone100 : T.paper2,
                    color: ativa ? T.ink : T.stone400,
                  }}
                >
                  {prontos}/{total}
                </span>
                {ativa && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: T.ink }} />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Descrição da categoria ── */}
        <p className="text-[13px]" style={{ color: T.stone400 }}>
          {CATEGORIAS[categoria].descricao}
        </p>

        {/* ── Grid de vídeos ── */}
        {videosFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl p-16 text-center" style={{ border: `1px solid ${T.stone200}` }}>
            <Search className="w-10 h-10 mx-auto mb-3" style={{ color: T.stone200 }} />
            <p className="font-semibold" style={{ color: T.stone400 }}>Nenhum vídeo encontrado para "{busca}"</p>
            <button
              onClick={() => setBusca("")}
              className="mt-3 text-sm font-semibold underline"
              style={{ color: T.margem }}
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Destaques */}
            {destaques.length > 0 && (
              <div className="space-y-3">
                <p className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: T.stone400 }}>
                  ★ Destaque
                </p>
                <div className="grid grid-cols-1 gap-4">
                  {destaques.map(v => (
                    <VideoCard key={v.titulo} video={v} destaque onClick={() => setVideoAtivo(v)} />
                  ))}
                </div>
              </div>
            )}

            {/* Demais vídeos */}
            {restantes.length > 0 && (
              <div className="space-y-3">
                {destaques.length > 0 && (
                  <p className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: T.stone400 }}>
                    Todos os vídeos
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {restantes.map(v => (
                    <VideoCard key={v.titulo} video={v} onClick={() => setVideoAtivo(v)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  )
}
