import { useAccess } from '../access/AccessContext'
import { ProjectTitleProvider } from '../context/ProjectTitleContext'
import { Layout } from './Layout'

/** Laster prosjekttittel fra DB først når brukeren er innlogget (eller auth er av). */
export function AuthenticatedShell() {
  const { authEnabled, role } = useAccess()
  const loadFromDatabase = !authEnabled || role !== 'none'

  return (
    <ProjectTitleProvider loadFromDatabase={loadFromDatabase}>
      <Layout />
    </ProjectTitleProvider>
  )
}
