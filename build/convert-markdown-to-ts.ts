import { readFileSync, mkdirSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = join(__dirname, '..');
const PLUGINS_DIR = join(ROOT_DIR, 'plugins', 'cc10x');
const SRC_DIR = join(ROOT_DIR, 'src');
const DIST_DIR = join(ROOT_DIR, 'dist');

interface AgentFrontmatter {
  name: string;
  description: string;
  model: string;
  color: string;
  context: string;
  tools: string[];
  skills: string[];
}

interface SkillFrontmatter {
  name: string;
  description: string;
}

function parseFrontmatter(content: string): { frontmatter: any, body: string } {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error('Invalid frontmatter format');
  }
  
  const frontmatter = fmMatch[1].trim();
  const body = fmMatch[2].trim();
  
  // Parse YAML-like frontmatter (simple parsing)
  const parsed: any = {};
  frontmatter.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      let value = valueParts.join(':').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (key === 'tools' && typeof value === 'string') {
        parsed[key] = value.split(', ').map(t => t.trim());
      } else if (key === 'skills' && typeof value === 'string') {
        parsed[key] = value.split(', ').map(s => s.trim());
      } else {
        parsed[key] = value;
      }
    }
  });
  
  return { frontmatter: parsed, body };
}

function generateAgentCode(agentFile: string, agentContent: string): string {
  const { frontmatter, body } = parseFrontmatter(agentContent);
  
  return `// Auto-generated from ${agentFile}
export const ${frontmatter.name.replace(/-/g, '_')} = {
  name: '${frontmatter.name}',
  description: \`${frontmatter.description}\`,
  model: '${frontmatter.model}' === 'inherit' ? 'anthropic/claude-sonnet-4-20250514' : '${frontmatter.model}',
  color: '${frontmatter.color}',
  context: '${frontmatter.context}',
  tools: ${JSON.stringify(frontmatter.tools || [])},
  skills: ${JSON.stringify(frontmatter.skills || [])},
  instructions: \`${body.replace(/`/g, '\\`')}\`
};
`;
}

function generateSkillCode(skillFile: string, skillContent: string): string {
  const { frontmatter, body } = parseFrontmatter(skillContent);
  
  return `// Auto-generated from ${skillFile}
export const ${frontmatter.name.replace(/-/g, '_')} = {
  name: '${frontmatter.name}',
  description: \`${frontmatter.description}\`,
  instructions: \`${body.replace(/`/g, '\\`')}\`
};
`;
}

function generateAgentsIndex(agents: any[]): string {
  if (agents.length === 0) {
    return 'export const agents = {};\n';
  }
  
  const imports = agents.map(a => 
    `export { ${a.name.replace(/-/g, '_')} } from './agents/${a.name}.js'`
  ).join('\n');
  
  const exports = agents.map(a => 
    `  '${a.name}': ${a.name.replace(/-/g, '_')}`
  ).join(',\n');
  
  return `${imports}

export const agents = {
${exports}
};
`;
}

function generateSkillsIndex(skills: any[]): string {
  if (skills.length === 0) {
    return 'export const skills = {};\n';
  }
  
  const imports = skills.map(s => 
    `export { ${s.name.replace(/-/g, '_')} } from './skills/${s.name}.js'`
  ).join('\n');
  
  const exports = skills.map(s => 
    `  '${s.name}': ${s.name.replace(/-/g, '_')}`
  ).join(',\n');
  
  return `${imports}

export const skills = {
${exports}
};
`;
}

function main() {
  console.log('🔨 Building OpenCode cc10x plugin from markdown sources...');
  
  // Ensure directories exist
  mkdirSync(SRC_DIR, { recursive: true });
  mkdirSync(join(SRC_DIR, 'agents'), { recursive: true });
  mkdirSync(join(SRC_DIR, 'skills'), { recursive: true });
  mkdirSync(DIST_DIR, { recursive: true });
  
  // Check if source directories exist
  if (!existsSync(PLUGINS_DIR)) {
    console.error(`❌ Plugins directory not found: ${PLUGINS_DIR}`);
    console.log('Make sure you are running this from the cc10x repository root.');
    process.exit(1);
  }
  
  // Process agents
  const agentsDir = join(PLUGINS_DIR, 'agents');
  const agentFiles = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  
  const agents: any[] = [];
  
  for (const agentFile of agentFiles) {
    const fullPath = join(agentsDir, agentFile);
    const content = readFileSync(fullPath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);
    
    const tsCode = generateAgentCode(agentFile, content);
    const outputPath = join(SRC_DIR, 'agents', `${frontmatter.name}.js`);
    writeFileSync(outputPath, tsCode);
    
    agents.push({ name: frontmatter.name, ...frontmatter });
    console.log(`  ✅ Generated agent: ${frontmatter.name}`);
  }
  
  // Generate agents index
  const agentsIndex = generateAgentsIndex(agents);
  writeFileSync(join(SRC_DIR, 'agents.js'), agentsIndex);
  
  // Process skills
  const skillsDir = join(PLUGINS_DIR, 'skills');
  const skillDirs = readdirSync(skillsDir).filter(d => {
    const stat = existsSync(join(skillsDir, d)) ? { isDirectory: () => true } : { isDirectory: () => false };
    return stat.isDirectory() && !d.startsWith('.');
  });
  
  const skills: any[] = [];
  
  for (const skillDir of skillDirs) {
    const skillFile = join(skillsDir, skillDir, 'SKILL.md');
    if (existsSync(skillFile)) {
      const content = readFileSync(skillFile, 'utf-8');
      const { frontmatter } = parseFrontmatter(content);
      
      const tsCode = generateSkillCode(skillFile, content);
      const outputPath = join(SRC_DIR, 'skills', `${frontmatter.name}.js`);
      writeFileSync(outputPath, tsCode);
      
      skills.push({ name: frontmatter.name, ...frontmatter });
      console.log(`  ✅ Generated skill: ${frontmatter.name}`);
    }
  }
  
  // Generate skills index
  const skillsIndex = generateSkillsIndex(skills);
  writeFileSync(join(SRC_DIR, 'skills.js'), skillsIndex);
  
  console.log(`\n🎉 Build complete! Generated ${agents.length} agents and ${skills.length} skills.`);
}

main();