import { useState, type ReactNode } from 'react'
import { Box, Card, CardContent, Collapse, IconButton, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

interface SectionCardProps {
  title: string
  description?: ReactNode
  children?: ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
}

export default function SectionCard({
  title,
  description,
  children,
  collapsible = false,
  defaultExpanded = true,
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const header = (
    <Box>
      <Typography variant='h6'>{title}</Typography>
      {description && (
        <Typography color='text.secondary' variant='body2'>
          {description}
        </Typography>
      )}
    </Box>
  )

  if (!collapsible) {
    return (
      <Card variant='outlined'>
        <CardContent>
          <Box sx={{ mb: 2 }}>{header}</Box>
          {children}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant='outlined'>
      <CardContent>
        <Box
          component='button'
          type='button'
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          sx={{
            all: 'unset',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            width: '100%',
            cursor: 'pointer',
          }}
        >
          {header}
          <IconButton component='span' size='small' aria-hidden tabIndex={-1}>
            <ExpandMoreIcon
              sx={{
                transition: (theme) => theme.transitions.create('transform'),
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </IconButton>
        </Box>
        <Collapse in={expanded} timeout='auto' unmountOnExit>
          <Box sx={{ mt: 2 }}>{children}</Box>
        </Collapse>
      </CardContent>
    </Card>
  )
}
