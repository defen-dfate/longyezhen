/* ============================================================
 * 站点模块清单 —— 侧边导航、模块内子导航、综合管理健康检查共用同一份定义
 * ============================================================ */
export type ModuleGroup = 'resume' | 'tools' | 'gis' | 'admin'

export interface ModuleDef {
  key: string
  name: string
  path: string
  group: ModuleGroup
  desc: string
  /** 侧边导航图标 key */
  icon?: string
}

export const GROUPS: Array<{ key: ModuleGroup; name: string; desc: string; path: string }> = [
  { key: 'resume', name: '自我介绍', desc: '基本信息 / 技能 / 经历 / 项目 / 教育', path: '/resume/profile' },
  { key: 'gis', name: '地震监测与分析', desc: '水库地震监测与层析成像', path: '/gis/overview' },
  { key: 'tools', name: '实用工具', desc: '在线小工具集合，全部本地运行', path: '/tools/image-compressor' },
  { key: 'admin', name: '综合管理', desc: '模块运行状态监测与系统指标', path: '/admin/overview' }
]

export const MODULES: ModuleDef[] = [
  /* ---------- 个人简历 ---------- */
  { key: 'resume-profile', name: '基本信息', path: '/resume/profile', group: 'resume', desc: '个人名片与联系方式' },
  { key: 'resume-skills', name: '专业技能', path: '/resume/skills', group: 'resume', desc: '技术栈与能力雷达' },
  { key: 'resume-experience', name: '实习经历', path: '/resume/experience', group: 'resume', desc: '实习经历与职责' },
  { key: 'resume-projects', name: '项目作品', path: '/resume/projects', group: 'resume', desc: '重点项目与成果' },
  { key: 'resume-education', name: '教育背景', path: '/resume/education', group: 'resume', desc: '学历与证书荣誉' },

  /* ---------- 实用工具 ---------- */
  { key: 'tool-compressor', name: '图像压缩', path: '/tools/image-compressor', group: 'tools', desc: '指定目标大小批量压缩' },
  { key: 'tool-home', name: '工具总览', path: '/tools', group: 'tools', desc: '全部工具入口' },

  /* ---------- WebGIS ---------- */
  { key: 'gis-overview', name: '监测总览', path: '/gis/overview', group: 'gis', desc: '地震事件与台站分布地图' },
  { key: 'gis-eq-frequency', name: '地震频次分析', path: '/gis/eq-frequency', group: 'gis', desc: '震级-频度与时间分布' },
  { key: 'gis-water-seismicity', name: '水位-地震活动性', path: '/gis/water-seismicity', group: 'gis', desc: '蓄水位与地震频次关联' },
  { key: 'gis-water-bvalue', name: '水位-b值分析', path: '/gis/water-bvalue', group: 'gis', desc: '不同蓄水阶段 b 值对比' },
  { key: 'gis-genesis', name: '成因机理研判', path: '/gis/genesis', group: 'gis', desc: '水库地震成因定量研判' },
  { key: 'gis-data-selection', name: '数据选取', path: '/gis/data-selection', group: 'gis', desc: '台站与事件数据筛选' },
  { key: 'gis-model-params', name: '模型与参数', path: '/gis/model-params', group: 'gis', desc: '反演网格与参数配置' },
  { key: 'gis-checkerboard', name: '棋盘格测试', path: '/gis/checkerboard', group: 'gis', desc: '分辨率与可靠性检验' },
  { key: 'gis-imaging', name: '成像结果', path: '/gis/imaging', group: 'gis', desc: '速度结构成像切片' },
  { key: 'gis-noise', name: '噪声面波成像', path: '/gis/noise', group: 'gis', desc: '互相关 / 频散 / 速度结构' },
  { key: 'gis-tasks', name: '任务监控', path: '/gis/tasks', group: 'gis', desc: '计算任务队列与状态' },

  /* ---------- 综合管理 ---------- */
  { key: 'admin-overview', name: '运行总览', path: '/admin/overview', group: 'admin', desc: '各模块状态一览' },
  { key: 'admin-health', name: '健康检测', path: '/admin/health', group: 'admin', desc: '逐模块探针与诊断' },
  { key: 'admin-metrics', name: '性能指标', path: '/admin/metrics', group: 'admin', desc: '真实运行时性能数据' },
  { key: 'admin-logs', name: '运行日志', path: '/admin/logs', group: 'admin', desc: '系统事件与操作记录' },
  { key: 'admin-settings', name: '系统设置', path: '/admin/settings', group: 'admin', desc: '认证 / 底图 / 外观' }
]

export function modulesOf(group: ModuleGroup): ModuleDef[] {
  return MODULES.filter((m) => m.group === group)
}

export function findModule(path: string): ModuleDef | undefined {
  return MODULES.find((m) => m.path === path)
}
