import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Database, Server, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

export const Route = createFileRoute('/landing')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans selection:bg-primary/10">
      {/* Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
      />

      <div className="relative z-10 container mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20 text-primary-foreground">
              <Zap className="h-6 w-6 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Diff Streamer</h1>
              <p className="text-xs font-mono text-muted-foreground tracking-wide uppercase">Engineering Console</p>
            </div>
          </div>
        </header>

        {/* Hero / Visualizer */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Real-time CDC Engine Active
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              Data streaming with <br/>
              <span className="text-primary">mechanical precision.</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-md leading-relaxed">
              Seamlessly capture changes from PostgreSQL and MySQL and stream them to Kafka with zero friction.
            </p>
            
            <div className="flex items-center gap-4 pt-2">
              <Link to="/">
                <Button 
                  size="lg" 
                  className="h-12 px-8 bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 rounded-full font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Get Started
                </Button>
              </Link>
              <Link to="/config">
                <Button variant="outline" size="lg" className="h-12 px-8 rounded-full border-slate-200 text-slate-700 hover:bg-white hover:text-slate-900">
                  View Configuration
                </Button>
              </Link>
            </div>
          </div>

          {/* Diagram */}
          <div className="relative h-[300px] w-full bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 p-8 flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:14px_24px] opacity-40"></div>
             
             <div className="relative z-10 flex items-center gap-8 md:gap-16 w-full justify-center">
                {/* Source */}
                <div className="flex flex-col items-center gap-3">
                  <div className="h-16 w-16 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center relative z-10">
                    <Database className="h-8 w-8 text-slate-400" />
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-500 uppercase tracking-wider">Source</span>
                </div>

                {/* Flow Animation */}
                <div className="flex-1 h-px bg-slate-200 relative max-w-[200px]">
                  <motion.div 
                    className="absolute top-1/2 -translate-y-1/2 h-1.5 w-8 bg-primary rounded-full blur-[1px]"
                    animate={{ x: ["-20%", "400%"], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div 
                    className="absolute top-1/2 -translate-y-1/2 h-2 w-2 bg-primary rounded-full z-20"
                    animate={{ left: ["0%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </div>

                {/* Engine */}
                <div className="flex flex-col items-center gap-3">
                  <div className="h-20 w-20 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-center relative z-10 backdrop-blur-sm">
                    <Zap className="h-10 w-10 text-primary" />
                  </div>
                  <span className="text-xs font-mono font-medium text-primary uppercase tracking-wider">Streamer</span>
                </div>

                {/* Flow Animation 2 */}
                <div className="flex-1 h-px bg-slate-200 relative max-w-[200px]">
                  <motion.div 
                    className="absolute top-1/2 -translate-y-1/2 h-1.5 w-8 bg-primary rounded-full blur-[1px]"
                    animate={{ x: ["-20%", "400%"], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  />
                   <motion.div 
                    className="absolute top-1/2 -translate-y-1/2 h-2 w-2 bg-primary rounded-full z-20"
                    animate={{ left: ["0%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 1 }}
                  />
                </div>

                {/* Dest */}
                <div className="flex flex-col items-center gap-3">
                  <div className="h-16 w-16 bg-slate-900 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-center relative z-10">
                    <Server className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-500 uppercase tracking-wider">Kafka</span>
                </div>
             </div>
          </div>
        </section>
      </div>
    </div>
  )
}

