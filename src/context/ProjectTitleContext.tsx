import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { fetchProject } from '../lib/project'

const defaultTitle = () =>
  import.meta.env.VITE_APP_TITLE?.trim() || 'Renoveringsprosjekt'

const ProjectTitleContext = createContext(defaultTitle())

type ProviderProps = {
  children: ReactNode
  /** Hent navn fra databasen (kun etter innlogging). */
  loadFromDatabase?: boolean
}

export function ProjectTitleProvider({
  children,
  loadFromDatabase = false,
}: ProviderProps) {
  const [title, setTitle] = useState(defaultTitle)

  useEffect(() => {
    if (!loadFromDatabase) return
    void fetchProject()
      .then((p) => {
        if (p?.name?.trim()) {
          setTitle(p.name.trim())
          document.title = p.name.trim()
        }
      })
      .catch(() => {
        /* behold fallback */
      })
  }, [loadFromDatabase])

  return (
    <ProjectTitleContext.Provider value={title}>
      {children}
    </ProjectTitleContext.Provider>
  )
}

export function useProjectTitle(): string {
  return useContext(ProjectTitleContext)
}
