'use client'

import dayjs from 'dayjs'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

interface ChartDataPoint {
  date: string
  value: number | null
  change1d: number | null
}

interface IndicatorChartProps {
  data: ChartDataPoint[]
  displayName: string
}

const chartConfig = {
  value: {
    label: 'Value',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

export function IndicatorChart({ data, displayName }: IndicatorChartProps) {
  // Filter out null values and format for chart
  const chartData = data
    .filter((d) => d.value !== null)
    .map((d) => ({
      date: d.date,
      value: d.value,
      displayDate: formatDate(d.date),
    }))

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No historical data available</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate domain with some padding
  const values = chartData.map((d) => d.value as number)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const padding = (maxValue - minValue) * 0.1
  const domain: [number, number] = [
    Math.floor((minValue - padding) * 100) / 100,
    Math.ceil((maxValue + padding) * 100) / 100,
  ]

  return (
    <Card>
      <CardContent className="pt-6">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              domain={domain}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => value.toFixed(2)}
              width={60}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    if (payload?.[0]?.payload?.date) {
                      return formatFullDate(payload[0].payload.date)
                    }
                    return ''
                  }}
                  formatter={(value) => [
                    <span key="value" className="font-mono">
                      {typeof value === 'number' ? value.toFixed(4) : value}
                    </span>,
                    displayName,
                  ]}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#fillValue)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function formatDate(dateStr: string): string {
  return dayjs(dateStr).format('MMM D')
}

function formatFullDate(dateStr: string): string {
  return dayjs(dateStr).format('ddd, MMM D, YYYY')
}

