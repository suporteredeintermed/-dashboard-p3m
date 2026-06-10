import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Upload from './pages/Upload.jsx'
import Producao from './pages/Producao.jsx'
import LaudosMedico from './pages/LaudosMedico.jsx'
import Faturamento from './pages/Faturamento.jsx'
import Prazos from './pages/Prazos.jsx'
import Alertas from './pages/Alertas.jsx'
import Configuracao from './pages/Configuracao.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index          element={<Home />}         />
          <Route path="upload"  element={<Upload />}       />
          <Route path="producao" element={<Producao />}    />
          <Route path="laudos"  element={<LaudosMedico />} />
          <Route path="faturamento" element={<Faturamento />} />
          <Route path="prazos"  element={<Prazos />}       />
          <Route path="alertas" element={<Alertas />}      />
          <Route path="config"  element={<Configuracao />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
