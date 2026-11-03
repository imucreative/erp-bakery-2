import type { Component } from 'vue'

export interface SubItem {
  name: string
  path: string
  pro?: boolean
  new?: boolean
  soon?: boolean
  permission?: string
}

export interface NavItem {
  icon?: Component
  name: string
  path?: string
  subItems?: SubItem[]
  new?: boolean
  pro?: boolean
  soon?: boolean
  permission?: string
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export interface OpenSubmenu {
  groupTitle: string
  itemIndex: number
}
