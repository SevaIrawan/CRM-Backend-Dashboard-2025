// =============================================
// BRAND ACCESS HELPER
// =============================================
// Helper functions for Squad Lead brand-level access control
// Date: 2025-11-03
// =============================================

import { NextRequest } from 'next/server'

export interface UserSession {
  id: string
  username: string
  role: string
  allowed_brands: string[] | null // null = access ALL brands (unrestricted)
  loginAt: string
}

/**
 * Get user session from request headers
 * TODO: Implement proper auth logic (e.g., JWT token validation)
 * For now, we'll extract from a custom header or implement based on your auth system
 */
export const getUserFromRequest = (request: NextRequest): UserSession | null => {
  try {
    // Option 1: Get from custom header (if you pass it from frontend)
    const userHeader = request.headers.get('x-user-session')
    if (userHeader) {
      return JSON.parse(userHeader)
    }
    
    // Option 2: Get from cookie (more common)
    // const cookies = request.cookies
    // const userCookie = cookies.get('nexmax_user')
    // if (userCookie) {
    //   return JSON.parse(userCookie.value)
    // }
    
    // For now, return null (will need to implement based on your auth system)
    return null
  } catch (error) {
    console.error('❌ Error parsing user session:', error)
    return null
  }
}

/**
 * Filter brands based on user's allowed_brands
 * @param allBrands - All available brands from database
 * @param userAllowedBrands - User's allowed brands (null = unrestricted)
 * @returns Filtered brands array
 */
export const filterBrandsByUser = (
  allBrands: string[], 
  userAllowedBrands: string[] | null
): string[] => {
  // null or empty = no restriction, return all brands
  if (!userAllowedBrands || userAllowedBrands.length === 0) {
    return allBrands
  }
  
  // Filter to only allowed brands - NO EXCEPTIONS
  const filteredBrands = allBrands.filter(brand => 
    userAllowedBrands.includes(brand)
  )
  
  return filteredBrands
}

/**
 * Remove 'ALL' option for Squad Lead users
 * @param brands - Array of brand names
 * @param userAllowedBrands - User's allowed brands (null = unrestricted)
 * @returns Brands array without 'ALL' if user is Squad Lead
 */
export const removeAllOptionForSquadLead = (
  brands: string[],
  userAllowedBrands: string[] | null
): string[] => {
  // If user has unrestricted access (null), keep 'ALL' option
  if (!userAllowedBrands || userAllowedBrands.length === 0) {
    return brands
  }
  
  // Remove 'ALL' option for Squad Lead users
  return brands.filter(brand => brand !== 'ALL')
}

/**
 * Apply brand filter to Supabase query
 * @param query - Supabase query object
 * @param selectedLine - Selected brand/line from slicer
 * @param userAllowedBrands - User's allowed brands (null = unrestricted)
 * @returns Filtered query
 */
export const applyBrandFilter = (
  query: any, 
  selectedLine: string, 
  userAllowedBrands: string[] | null
) => {
  // Admin/Manager/SQ = no restriction
  if (!userAllowedBrands || userAllowedBrands.length === 0) {
    if (selectedLine && selectedLine !== 'ALL') {
      return query.eq('line', selectedLine)
    }
    // selectedLine === 'ALL' => no filter, return all
    return query
  }
  
  // Squad Lead = restrict to allowed brands only
  if (selectedLine === 'ALL') {
    // User selected "ALL" but they should not have this option
    // Filter to user's allowed brands
    return query.in('line', userAllowedBrands)
  } else {
    // User selected specific brand - validate access first
    if (!userAllowedBrands.includes(selectedLine)) {
      throw new Error(`Unauthorized: You do not have access to brand "${selectedLine}"`)
    }
    return query.eq('line', selectedLine)
  }
}

/**
 * Get default brand for Squad Lead user (first brand in their allowed list)
 * @param userAllowedBrands - User's allowed brands
 * @returns First brand name or null
 */
export const getDefaultBrandForSquadLead = (
  userAllowedBrands: string[] | null
): string | null => {
  if (!userAllowedBrands || userAllowedBrands.length === 0) {
    return null
  }
  return userAllowedBrands[0] || null
}

/**
 * Validate if user can access the selected brand
 * @param selectedBrand - Brand selected by user
 * @param userAllowedBrands - User's allowed brands (null = unrestricted)
 * @returns true if access granted, false otherwise
 */
export const validateBrandAccess = (
  selectedBrand: string,
  userAllowedBrands: string[] | null
): boolean => {
  // null = unrestricted access
  if (!userAllowedBrands || userAllowedBrands.length === 0) {
    return true
  }
  
  // 'ALL' should not be allowed for Squad Lead
  if (selectedBrand === 'ALL') {
    return false
  }
  
  // Check if brand is in allowed list
  return userAllowedBrands.includes(selectedBrand)
}

/**
 * Get allowed brands from localStorage (frontend helper)
 * @returns User's allowed brands or null
 */
export const getAllowedBrandsFromStorage = (): string[] | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const userStr = localStorage.getItem('nexmax_user')
    if (!userStr) return null
    
    const user = JSON.parse(userStr)
    return user.allowed_brands || null
  } catch (error) {
    console.error('❌ Error reading allowed_brands from storage:', error)
    return null
  }
}

