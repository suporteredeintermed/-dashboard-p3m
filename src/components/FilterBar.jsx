export default function FilterBar({ filters, onChange, empresas = [], medicos = [], modalidades = [] }) {
  const { empresa = '', medico = '', modalidade = '', dataInicio = '', dataFim = '' } = filters

  const set = (k, v) => onChange({ ...filters, [k]: v })

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {empresas.length > 0 && (
        <select className="select text-xs py-1.5" value={empresa} onChange={e => set('empresa', e.target.value)}>
          <option value="">Todas as unidades</option>
          {empresas.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      )}
      {medicos.length > 0 && (
        <select className="select text-xs py-1.5" value={medico} onChange={e => set('medico', e.target.value)}>
          <option value="">Todos os médicos</option>
          {medicos.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      )}
      {modalidades.length > 0 && (
        <select className="select text-xs py-1.5" value={modalidade} onChange={e => set('modalidade', e.target.value)}>
          <option value="">Todas as modalidades</option>
          {modalidades.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      )}
      <input
        type="date"
        className="input text-xs py-1.5"
        value={dataInicio}
        onChange={e => set('dataInicio', e.target.value)}
        placeholder="De"
      />
      <input
        type="date"
        className="input text-xs py-1.5"
        value={dataFim}
        onChange={e => set('dataFim', e.target.value)}
        placeholder="Até"
      />
      {(empresa || medico || modalidade || dataInicio || dataFim) && (
        <button
          className="text-xs text-p3m-muted hover:text-p3m-teal transition-colors"
          onClick={() => onChange({ empresa: '', medico: '', modalidade: '', dataInicio: '', dataFim: '' })}
        >
          Limpar filtros
        </button>
      )}
    </div>
  )
}
