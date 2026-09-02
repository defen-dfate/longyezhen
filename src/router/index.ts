import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const MainLayout = () => import('@/layouts/MainLayout.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: '登录' }
  },
  {
    path: '/select',
    name: 'select',
    component: () => import('@/views/ModuleSelectView.vue'),
    meta: { public: false, title: '模块选择' }
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/select',
    children: [
      /* ---------- 1. 个人简历 ---------- */
      {
        path: 'resume',
        component: () => import('@/views/resume/ResumeLayout.vue'),
        redirect: '/resume/profile',
        children: [
          {
            path: 'profile',
            name: 'resume-profile',
            component: () => import('@/views/resume/ProfileView.vue'),
            meta: { title: '基本信息', group: 'resume' }
          },
          {
            path: 'skills',
            name: 'resume-skills',
            component: () => import('@/views/resume/SkillsView.vue'),
            meta: { title: '专业技能', group: 'resume' }
          },
          {
            path: 'experience',
            name: 'resume-experience',
            component: () => import('@/views/resume/ExperienceView.vue'),
            meta: { title: '实习经历', group: 'resume' }
          },
          {
            path: 'projects',
            name: 'resume-projects',
            component: () => import('@/views/resume/ProjectsView.vue'),
            meta: { title: '项目作品', group: 'resume' }
          },
          {
            path: 'education',
            name: 'resume-education',
            component: () => import('@/views/resume/EducationView.vue'),
            meta: { title: '教育背景', group: 'resume' }
          }
        ]
      },

      /* ---------- 2. 实用工具 ---------- */
      {
        path: 'tools',
        component: () => import('@/views/tools/ToolsLayout.vue'),
        redirect: '/tools/image-compressor',
        children: [
          {
            path: '',
            name: 'tools-home',
            component: () => import('@/views/tools/ToolsHome.vue'),
            meta: { title: '工具总览', group: 'tools' }
          },
          {
            path: 'image-compressor',
            name: 'tool-compressor',
            component: () => import('@/views/tools/ImageCompressor.vue'),
            meta: { title: '图像压缩', group: 'tools' }
          }
        ]
      },

      /* ---------- 3. WebGIS ---------- */
      {
        path: 'gis',
        component: () => import('@/views/gis/GisLayout.vue'),
        redirect: '/gis/overview',
        children: [
          {
            path: 'overview',
            name: 'gis-overview',
            component: () => import('@/views/gis/GisOverview.vue'),
            meta: { title: '监测总览', group: 'gis' }
          },
          {
            path: 'eq-frequency',
            name: 'gis-eq-frequency',
            component: () => import('@/views/gis/EqFrequency.vue'),
            meta: { title: '地震频次分析', group: 'gis' }
          },
          {
            path: 'water-seismicity',
            name: 'gis-water-seismicity',
            component: () => import('@/views/gis/WaterSeismicity.vue'),
            meta: { title: '水位-地震活动性', group: 'gis' }
          },
          {
            path: 'water-bvalue',
            name: 'gis-water-bvalue',
            component: () => import('@/views/gis/WaterBValue.vue'),
            meta: { title: '水位-b值分析', group: 'gis' }
          },
          {
            path: 'genesis',
            name: 'gis-genesis',
            component: () => import('@/views/gis/GenesisMechanism.vue'),
            meta: { title: '成因机理研判', group: 'gis' }
          },
          {
            path: 'data-selection',
            name: 'gis-data-selection',
            component: () => import('@/views/gis/DataSelection.vue'),
            meta: { title: '数据选取', group: 'gis' }
          },
          {
            path: 'model-params',
            name: 'gis-model-params',
            component: () => import('@/views/gis/ModelParams.vue'),
            meta: { title: '模型与参数', group: 'gis' }
          },
          {
            path: 'checkerboard',
            name: 'gis-checkerboard',
            component: () => import('@/views/gis/CheckerboardTest.vue'),
            meta: { title: '棋盘格测试', group: 'gis' }
          },
          {
            path: 'imaging',
            name: 'gis-imaging',
            component: () => import('@/views/gis/ImagingResult.vue'),
            meta: { title: '成像结果', group: 'gis' }
          },
          {
            path: 'noise',
            name: 'gis-noise',
            component: () => import('@/views/gis/NoiseImaging.vue'),
            meta: { title: '噪声面波成像', group: 'gis' }
          },
          {
            path: 'tasks',
            name: 'gis-tasks',
            component: () => import('@/views/gis/TaskMonitor.vue'),
            meta: { title: '任务监控', group: 'gis' }
          }
        ]
      },

      /* ---------- 4. 综合管理 ---------- */
      {
        path: 'admin',
        component: () => import('@/views/admin/AdminLayout.vue'),
        redirect: '/admin/overview',
        children: [
          {
            path: 'overview',
            name: 'admin-overview',
            component: () => import('@/views/admin/OverviewView.vue'),
            meta: { title: '运行总览', group: 'admin' }
          },
          {
            path: 'health',
            name: 'admin-health',
            component: () => import('@/views/admin/HealthView.vue'),
            meta: { title: '健康检测', group: 'admin' }
          },
          {
            path: 'metrics',
            name: 'admin-metrics',
            component: () => import('@/views/admin/MetricsView.vue'),
            meta: { title: '性能指标', group: 'admin' }
          },
          {
            path: 'logs',
            name: 'admin-logs',
            component: () => import('@/views/admin/LogsView.vue'),
            meta: { title: '运行日志', group: 'admin' }
          },
          {
            path: 'settings',
            name: 'admin-settings',
            component: () => import('@/views/admin/SettingsView.vue'),
            meta: { title: '系统设置', group: 'admin' }
          }
        ]
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/resume/profile' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (auth.isLogin && to.name === 'login') return { path: '/select' }
    return true
  }
  if (!auth.isLogin) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

router.afterEach((to) => {
  const title = (to.meta.title as string) || ''
  document.title = title ? `${title} · WorkBench` : 'WorkBench · 个人工作门户'
  if (!to.meta.public) {
    const app = useAppStore()
    app.markVisit(to.path)
  }
})

export default router
