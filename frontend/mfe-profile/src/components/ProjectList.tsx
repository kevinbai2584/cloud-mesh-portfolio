import { useEffect, useState } from 'react';

interface Project {
  id: number;
  title: string;
  description: string;
  viewCount: number;
  techStacks: string[];
  createdAt: string;
}

interface ServiceNode {
  name: string;
  role: string;
  status: 'UP' | 'DOWN' | 'CHECKING';
  latencyMs?: number;
  details?: string;
}

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activeHittingId, setActiveHittingId] = useState<number | null>(null);

  const [nodes, setNodes] = useState<Record<string, ServiceNode>>({
    service: { name: 'Profile Core', role: 'Spring Boot 4.1', status: 'CHECKING' },
    db: { name: 'PostgreSQL DB', role: 'Persistence Store', status: 'CHECKING' },
    redis: { name: 'Redis Cache', role: 'In-Memory Cache', status: 'CHECKING' },
  });

  const checkHealth = async () => {
    const start = performance.now();
    try {
      const res = await fetch('/actuator/health');
      const latency = Math.round(performance.now() - start);

      if (res.ok) {
        const data = await res.json();
        const comps = data.components || data.details || {};
        const dbNode = comps.db || comps.dataSource;
        const dbStatus = String(dbNode?.status || '').toUpperCase() === 'UP' || !!dbNode ? 'UP' : 'DOWN';
        const dbType = dbNode?.details?.database || 'PostgreSQL 16';

        const redisNode = comps.redis;
        const redisStatus = String(redisNode?.status || '').toUpperCase() === 'UP' || !!redisNode ? 'UP' : 'DOWN';
        const redisVer = redisNode?.details?.version ? `v${redisNode.details.version}` : 'Active Cache';

        setNodes({
          service: { name: 'Profile Core', role: 'Spring Boot 4.1', status: 'UP', latencyMs: latency },
          db: { name: 'PostgreSQL DB', role: 'AWS RDS Dual-Store', status: dbStatus, details: dbType },
          redis: { name: 'Redis Cache', role: 'Cache-Aside Node', status: redisStatus, details: redisVer },
        });
      } else {
        throw new Error('Unreachable');
      }
    } catch {
      setNodes((prev) => ({
        service: { ...prev.service, status: 'DOWN' },
        db: { ...prev.db, status: 'DOWN' },
        redis: { ...prev.redis, status: 'DOWN' },
      }));
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/v1/profile/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleProjectClick = async (projectId: number) => {
    setActiveHittingId(projectId);
    try {
      await fetch(`/api/v1/profile/projects/${projectId}/view`, { method: 'POST' });
      await fetchProjects();
    } catch (err) {
      console.error('Failed to log project interaction:', err);
    } finally {
      setTimeout(() => setActiveHittingId(null), 300);
    }
  };

  const technicalSkills = [
    {
      category: 'Languages',
      skills: 'C/C++, Go, Python, Java, SQL, JavaScript/TypeScript, RISC-V, x86 Assembly',
    },
    {
      category: 'Cloud & DevOps',
      skills: 'AWS (EC2, S3, RDS, Lambda, ECS, CloudWatch, IAM), Docker, Linux/Unix, Git, CI/CD',
    },
    {
      category: 'Frameworks & Backend',
      skills: 'Spring Boot, Apache Kafka, PostgreSQL, Redis, FastAPI, Node.js, Express, React',
    },
    {
      category: 'GenAI & LLMs',
      skills: 'RAG, LangChain, LangGraph, Vector DBs (Chroma/FAISS), OpenAI API, Multi-Agent Systems',
    },
  ];

  return (
    <div style={{ color: '#f1f5f9', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* 1. Header & Hero Section */}
      <section style={{ marginBottom: 32, borderBottom: '1px solid #1e293b', paddingBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 9999, backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#38bdf8' }}></span>
              Open to Software Engineer Opportunities
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: '#ffffff', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
              Yu (Kevin) Bai
            </h1>
            <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 720, lineHeight: 1.6, margin: '0 0 14px 0' }}>
              UC Berkeley EECS graduate specializing in <strong>distributed backend systems, operating system kernels (CS162), and agentic workflows</strong>. Experienced in building high-concurrency caching pipelines, event-driven microservices, and modular frontend architectures.
            </p>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#94a3b8', flexWrap: 'wrap' }}>
              <span>📍 Walnut, CA</span>
              <span>📞 </span>
              <span>✉️ <a href="mailto:yubai28@berkeley.edu" style={{ color: '#38bdf8', textDecoration: 'none' }}>yubai28@berkeley.edu</a></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href="https://linkedin.com/in/yu-bai-46886b282"
              target="_blank"
              rel="noreferrer"
              style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: '#ffffff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
            >
              LinkedIn
            </a>
            <a
              href="https://github.com/kevinbai2584"
              target="_blank"
              rel="noreferrer"
              style={{ padding: '8px 16px', backgroundColor: '#1e293b', color: '#f1f5f9', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', border: '1px solid #334155' }}
            >
              GitHub (kevinbai2584)
            </a>
          </div>
        </div>
      </section>

      {/* 2. Education & Core Coursework */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: '#64748b', marginBottom: 12 }}>
          Education
        </h2>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#ffffff' }}>University of California, Berkeley</span>
            <span style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace' }}>Graduated Dec 2025 • Berkeley, CA</span>
          </div>
          <div style={{ fontSize: 14, color: '#38bdf8', fontWeight: 600, marginBottom: 14 }}>
            B.S. in Electrical Engineering and Computer Sciences (EECS)
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#cbd5e1' }}>
            <div>
              <strong style={{ color: '#f8fafc' }}>Systems & Architecture:</strong> Operating Systems (CS162), Machine Structures (CS61C), Data Structures (CS61B)
            </div>
            <div>
              <strong style={{ color: '#f8fafc' }}>Security & Networking:</strong> Computer Security (CS161), Internet Architecture & Protocols (CS168)
            </div>
            <div>
              <strong style={{ color: '#f8fafc' }}>AI & Theory:</strong> Artificial Intelligence (CS188), Discrete Math & Probability (CS70), UI Design (CS160)
            </div>
          </div>
        </div>
      </section>

      {/* 3. Technical Skills */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: '#64748b', marginBottom: 12 }}>
          Technical Skills
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {technicalSkills.map((grp) => (
            <div key={grp.category} style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>{grp.category}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, fontFamily: 'monospace' }}>
                {grp.skills}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Live Infrastructure Telemetry */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: '#64748b', margin: 0 }}>
            Live Infrastructure Telemetry (Host + Remote Mesh)
          </h2>
          <span style={{ fontSize: 12, color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
            Real-time Health Check via Spring Boot Actuator
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {Object.values(nodes).map((node) => (
            <div
              key={node.name}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 10,
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14 }}>{node.name}</span>
                <span style={{ fontSize: 12, color: node.status === 'UP' ? '#34d399' : '#f87171', fontWeight: 600 }}>
                  {node.status === 'UP' ? 'OPERATIONAL' : 'OFFLINE'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 12 }}>
                <span>{node.role}</span>
                <span style={{ fontFamily: 'monospace' }}>
                  {node.latencyMs !== undefined ? `${node.latencyMs}ms` : node.details || '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Verified Systems & Engineering Projects */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: '#64748b', margin: 0 }}>
            Featured Engineering Projects
          </h2>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Click card to trigger atomic increment & @CacheEvict in real time
          </span>
        </div>

        {loadingProjects ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b', border: '1px dashed #1e293b', borderRadius: 10 }}>
            Loading verified projects...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 16 }}>
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleProjectClick(project.id)}
                style={{
                  backgroundColor: '#0f172a',
                  border: activeHittingId === project.id ? '1px solid #38bdf8' : '1px solid #1e293b',
                  borderRadius: 12,
                  padding: 22,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: activeHittingId === project.id ? '0 0 20px rgba(56,189,248,0.2)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#ffffff' }}>
                      {project.title}
                    </h3>
                    <span
                      style={{
                        backgroundColor: 'rgba(56,189,248,0.1)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56,189,248,0.3)',
                        padding: '3px 10px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    >
                      Views: {project.viewCount}
                    </span>
                  </div>

                  <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px 0' }}>
                    {project.description}
                  </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 12, borderTop: '1px solid #1e293b' }}>
                  {project.techStacks.map((tech) => (
                    <span
                      key={tech}
                      style={{
                        backgroundColor: '#1e293b',
                        color: '#cbd5e1',
                        padding: '2px 8px',
                        borderRadius: 5,
                        fontSize: 11,
                        fontFamily: 'monospace',
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Leadership & Experience */}
      <section>
        <h2 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: '#64748b', marginBottom: 12 }}>
          Leadership & Experience
        </h2>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <strong style={{ color: '#ffffff', fontSize: 15 }}>President of Math Club</strong>
            <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>Feb 2022 – July 2022 • Mt. San Antonio College</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
            Directed a collegiate organization of 50+ members, coordinating weekly technical problem-solving sessions and collegiate math competitions. Mentored peers in advanced calculus, linear algebra, and discrete math.
          </p>
        </div>
      </section>
    </div>
  );
}

export default ProjectList;