import type { ReactNode } from 'react'
import { Card, CardContent, Typography } from '@mui/material'

interface SectionCardProps {
  title: string
  description?: ReactNode
  children?: ReactNode
}

export default function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <Card variant='outlined'>
      <CardContent>
        <Typography variant='h6' sx={{ mb: 1 }}>
          {title}
        </Typography>
        {description && (
          <Typography color='text.secondary' sx={{ mb: 2 }} variant='body2'>
            {description}
          </Typography>
        )}
        {children}
      </CardContent>
    </Card>
  )
}
