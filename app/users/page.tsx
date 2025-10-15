'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { 
  hasPermission, 
  canAccessUserManagement, 
  isReadOnly, 
  getAvailableRoles,
  getDefaultPageByRole
} from '@/utils/rolePermissions'

// Session utility functions
const validateSession = () => {
  try {
    const session = localStorage.getItem('nexmax_session')
    if (!session) return null
    
    const sessionData = JSON.parse(session)
    return sessionData
  } catch (error) {
    console.error('Session validation error:', error)
    cleanupSession()
    return null
  }
}

const cleanupSession = () => {
  try {
    localStorage.removeItem('user')
    localStorage.removeItem('nexmax_session')
    document.cookie = 'user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'username=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'user_role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  } catch (error) {
    console.error('Session cleanup error:', error)
  }
}

interface User {
  id: string
  username: string
  password: string
  role: string
  created_at?: string
  updated_at?: string
}

export default function UsersPage() {
  const [user, setUser] = useState<any>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user'
  })
  const [availableRoles] = useState(getAvailableRoles())
  const [authLoading, setAuthLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check authentication using utility function
    const sessionData = validateSession()
    if (!sessionData) {
      router.push('/login')
      return
    }

    // Check if user has permission to access User Management
    if (!canAccessUserManagement(sessionData.role)) {
      console.log('❌ Access denied: User does not have permission to access User Management')
      const defaultPage = getDefaultPageByRole(sessionData.role)
      router.push(defaultPage)
      return
    }

    setUser(sessionData)
    
    // Check dark mode preference
    const isDark = localStorage.getItem('darkMode') === 'true'
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    }

    // Fetch users after authentication
    fetchUsers()
    setAuthLoading(false)
  }, []) // Remove router from dependency to prevent re-runs

  const fetchUsers = async () => {
    try {
      console.log('🔍 Fetching users from Supabase...')
      setLoading(true)
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching users:', error)
        alert('Error loading users: ' + error.message)
        setUsers([])
      } else {
        console.log('✅ Users loaded from Supabase:', data?.length || 0, 'users')
        setUsers((data as unknown as User[]) || [])
      }
      
      setLoading(false)
    } catch (error) {
      console.error('❌ Error fetching users:', error)
      alert('Connection error while fetching users')
      setLoading(false)
      setUsers([])
    }
  }

  const handleLogout = () => {
    cleanupSession()
    router.push('/login')
  }

  const handleToggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.username.trim()) {
      alert('Username is required')
      return
    }
    if (!formData.password.trim()) {
      alert('Password is required')
      return
    }
    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    try {
      console.log('➕ Adding new user:', {
        username: formData.username,
        role: formData.role,
password: 'hidden for security'
      })
      
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username: formData.username.trim(),
          password: formData.password.trim(),
          role: formData.role
        }])
        .select()

      if (error) {
        console.error('❌ Error adding user:', error)
        if (error.code === '23505') {
          alert('Username already exists. Please choose a different username.')
        } else {
          alert('Failed to add user: ' + error.message)
        }
      } else {
        console.log('✅ User added successfully:', data)
        alert('User added successfully!')
        setFormData({ username: '', password: '', role: 'user' })
        setShowModal(false)
        fetchUsers() // Refresh the list
      }
    } catch (error) {
      console.error('❌ Error adding user:', error)
      alert('Connection error while adding user')
    }
  }

  const handleEditUser = (userToEdit: User) => {
    setEditingUser({
      ...userToEdit,
      password: '' // Don't show current password
    })
    setShowEditModal(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    // Validation
    if (!editingUser.username.trim()) {
      alert('Username is required')
      return
    }
    if (editingUser.password && editingUser.password.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    try {
      console.log('✏️ Updating user:', {
        id: editingUser.id,
        username: editingUser.username,
        role: editingUser.role,
password: editingUser.password ? 'updating' : 'keeping current'
      })
      
      const updateData: any = {
        username: editingUser.username.trim(),
        role: editingUser.role
      }
      
      // Only update password if provided
      if (editingUser.password && editingUser.password.trim()) {
        updateData.password = editingUser.password.trim()
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id)
        .select()

      if (error) {
        console.error('❌ Error updating user:', error)
        if (error.code === '23505') {
          alert('Username already exists. Please choose a different username.')
        } else {
          alert('Failed to update user: ' + error.message)
        }
      } else {
        console.log('✅ User updated successfully:', data)
        alert('User updated successfully!')
        setShowEditModal(false)
        setEditingUser(null)
        fetchUsers() // Refresh the list
      }
    } catch (error) {
      console.error('❌ Error updating user:', error)
      alert('Connection error while updating user')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      console.log('🗑️ Deleting user:', userId)
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) {
        console.error('❌ Error deleting user:', error)
        alert('Failed to delete user: ' + error.message)
      } else {
        console.log('✅ User deleted successfully')
        alert('User deleted successfully!')
        fetchUsers() // Refresh the list
      }
    } catch (error) {
      console.error('❌ Error deleting user:', error)
      alert('Connection error while deleting user')
    }
  }

  const handleResetPassword = async (userId: string) => {
    const newPassword = 'Reset123!'
    if (!confirm(`Are you sure you want to reset this user's password to: ${newPassword}?`)) return

    try {
      console.log('🔑 Resetting password for user:', userId)
      
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', userId)

      if (error) {
        console.error('❌ Error resetting password:', error)
        alert('Failed to reset password: ' + error.message)
      } else {
        console.log('✅ Password reset successfully')
        alert(`Password has been reset to: ${newPassword}`)
        fetchUsers() // Refresh the list
      }
    } catch (error) {
      console.error('❌ Error resetting password:', error)
      alert('Connection error while resetting password')
    }
  }

  const getLocalRoleDisplayName = (role: string) => {
    switch (role.toLowerCase()) {
      case 'hod department':
        return 'USC_DEP'
      case 'top manager':
        return 'TOP MANAGER'
      case 'admin':
        return 'ADMIN'
      case 'manager':
        return 'MANAGER'
      case 'user':
        return 'USER'
      case 'executive':
        return 'EXECUTIVE'
      case 'usc_dep':
        return 'USC_DEP'
      default:
        return role.toUpperCase()
    }
  }

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1d29 0%, #2d3142 50%, #1a1d29 100%)',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            animation: 'pulse 2s infinite'
          }}>
            ⚡
          </div>
          <h1 style={{
            fontSize: '2rem',
            marginBottom: '1rem',
            color: '#ffd700'
          }}>
            NEXMAX Dashboard
          </h1>
          <p style={{
            fontSize: '1.1rem',
            opacity: 0.8
          }}>
            Loading...
          </p>
        </div>
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}</style>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <Layout
      darkMode={darkMode}
      sidebarExpanded={sidebarExpanded}
      onToggleDarkMode={handleToggleDarkMode}
      onLogout={handleLogout}
    >
      <div className="user-management-container">
          <div className="user-management-frame">
            <div className="frame-header">
            <h2 className="frame-title">Users List</h2>
            <button 
              onClick={() => setShowModal(true)}
              className="add-user-btn"
            >
              <svg 
                className="add-user-icon" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 640 640"
              >
                <path d="M136 192C136 125.7 189.7 72 256 72C322.3 72 376 125.7 376 192C376 258.3 322.3 312 256 312C189.7 312 136 258.3 136 192zM48 546.3C48 447.8 127.8 368 226.3 368L285.7 368C384.2 368 464 447.8 464 546.3C464 562.7 450.7 576 434.3 576L77.7 576C61.3 576 48 562.7 48 546.3zM544 160C557.3 160 568 170.7 568 184L568 232L616 232C629.3 232 640 242.7 640 256C640 269.3 629.3 280 616 280L568 280L568 328C568 341.3 557.3 352 544 352C530.7 352 520 341.3 520 328L520 280L472 280C458.7 280 448 269.3 448 256C448 242.7 458.7 232 472 232L520 232L520 184C520 170.7 530.7 160 544 160z"/>
              </svg>
              Add New User
            </button>
          </div>
          
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                                      <th>Username</th>
                    <th>Password</th>
                    <th>Role</th>
                    <th>Created At</th>
                    <th>Updated At</th>
                    <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="loading-cell">
                      <div className="loading-spinner">
                        <div className="spinner"></div>
                        <span>Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-cell">
                      <div className="empty-state">
                        <span className="empty-icon">👥</span>
                        <span>No users found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="username-cell">{user.username}</td>
                      <td className="password-cell">••••••••</td>
                      <td>
                                                 <span className={`role-badge role-${user.role.toLowerCase().replace(/\s+/g, '-')}`}>
                           {getLocalRoleDisplayName(user.role)}
                         </span>
                      </td>
                      <td className="date-cell">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric'
                        }) : '-'}
                      </td>
                      <td className="date-cell">
                        {user.updated_at ? new Date(user.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric'
                        }) : '-'}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="action-btn edit-btn"
                            title="Edit User"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleResetPassword(user.id)}
                            className="action-btn reset-btn"
                            title="Reset Password"
                          >
                            Reset Password
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="action-btn delete-btn"
                            title="Delete User"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
                         </table>
           </div>
         </div>
       </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add New User</h3>
              <button 
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddUser} className="modal-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>

                            <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  {availableRoles.map(role => (
                    <option key={role} value={role}>
                      {getLocalRoleDisplayName(role)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit User</h3>
              <button 
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="modal-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password (Leave empty to keep current)</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={editingUser.password}
                  onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                >
                  {availableRoles.map(role => (
                    <option key={role} value={role}>
                      {getLocalRoleDisplayName(role)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`


                          .user-management-container {
            padding: 24px;
            height: calc(100vh - 90px);
            overflow-y: auto;
            overflow-x: hidden;
          }

         .user-management-frame {
           background: white;
           border-radius: 12px;
           box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
           border: 1px solid #e5e7eb;
           overflow: hidden;
           height: 100%;
           display: flex;
           flex-direction: column;
         }

        .frame-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 32px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .frame-title {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .add-user-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .add-user-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }

        .add-user-icon {
          width: 16px;
          height: 16px;
          fill: currentColor;
        }

        .table-wrapper {
          flex: 1;
          overflow: auto;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .users-table th {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 16px 20px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .users-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
        }

        .users-table tr:hover {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .username-cell {
          font-weight: 600;
          color: #1f2937;
        }

        .password-cell {
          font-family: monospace;
          color: #6b7280;
        }



        .date-cell {
          color: #6b7280;
          font-size: 13px;
        }

        .role-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .role-admin {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #dc2626;
          border: 1px solid #fca5a5;
        }

        .role-manager {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #2563eb;
          border: 1px solid #93c5fd;
        }

        .role-user {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .role-hod-department {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #d97706;
          border: 1px solid #fbbf24;
        }

        .role-top-manager {
          background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
          color: #7c3aed;
          border: 1px solid #a78bfa;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .edit-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        }

        .reset-btn {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
        }

        .delete-btn {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
        }

        .action-btn:hover {
          transform: translateY(-1px);
        }

        .edit-btn:hover {
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
        }

        .reset-btn:hover {
          box-shadow: 0 4px 8px rgba(245, 158, 11, 0.3);
        }

        .delete-btn:hover {
          box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
        }

        .loading-cell,
        .empty-cell {
          text-align: center;
          padding: 40px 20px;
        }

        .loading-spinner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #6b7280;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #6b7280;
        }

        .empty-icon {
          font-size: 24px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal {
          background: white;
          border-radius: 12px;
          width: 480px;
          max-width: 90vw;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 32px;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .modal-close:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .modal-form {
          padding: 32px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: white;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }

        .cancel-btn,
        .submit-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-btn {
          background: #f3f4f6;
          color: #374151;
        }

        .cancel-btn:hover {
          background: #e5e7eb;
        }

        .submit-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
        }

        .submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
        }

                          @media (max-width: 768px) {
            .user-management-container {
              padding: 16px;
              height: calc(100vh - 90px);
            }
          
          .frame-header {
            padding: 16px 20px;
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }
          
          .frame-title {
            font-size: 20px;
            text-align: center;
          }
          
          .users-table {
            font-size: 12px;
          }
          
          .users-table th,
          .users-table td {
            padding: 12px 8px;
          }
          
          .action-buttons {
            flex-direction: column;
            gap: 4px;
          }
          
          .action-btn {
            font-size: 10px;
            padding: 4px 8px;
          }
        }
      `}</style>
    </Layout>
  )
} 