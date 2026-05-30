import { Outlet, useOutletContext } from 'react-router-dom'
import { useAdminUsers } from '../../hooks/useAdminUsers'

type AdminContext = ReturnType<typeof useAdminUsers>

// Owns the admin user list once and shares it with the list + detail subroutes via outlet
// context, so role/key mutations made on the detail page stay in sync with the list.
export default function AdminLayout() {
  const admin = useAdminUsers()
  return <Outlet context={admin} />
}

export function useAdminContext() {
  return useOutletContext<AdminContext>()
}
