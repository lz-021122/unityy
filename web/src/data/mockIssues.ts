import type { Issue } from '../types';

export const HOTLINK_SCREENSHOT =
  '/assets/unity-inspect-evidence.png';

// Base 5 defined items from the inspection screenshot
const baseIssues: Issue[] = [
  {
    id: '#001',
    title: '泵出口法兰渗漏',
    desc: '泵出口法兰连接处存在微小液体渗漏迹象，螺栓可能预紧力不足或密封垫圈老化磨损，需停机紧固或更换密封件。',
    priority: 'HIGH',
    status: 'OPEN',
    scene: '泵房区',
    pos: { x: 12.354, y: 0.86, z: -5.217 },
    createdAt: '2026-10-28 12:14',
    updatedAt: '2026-10-28 12:14',
    screenshot: HOTLINK_SCREENSHOT,
    reporter: '张工 (巡检一班)',
    assignee: '李工 (机械维保组)',
    deviceCode: 'PUMP-A01-FLANGE',
    severityScore: 88,
    auditLogs: [
      { time: '2026-10-28 12:14', user: '张工', action: '通过 Unity 数字孪生巡检手持端上报隐患' },
      { time: '2026-10-28 12:15', user: '系统AI诊断', action: '智能图像比对完成，置信度 96.2%' },
    ],
  },
  {
    id: '#002',
    title: '电机温度异常',
    desc: '2号循环电机外壳红外测温达到 78.5℃，超出额定工作阈值 (70℃)，轴承箱伴随异常高频振动与轻微异响。',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    scene: '泵房区',
    pos: { x: 8.421, y: 1.036, z: -3.562 },
    createdAt: '2026-10-28 11:03',
    updatedAt: '2026-10-28 11:20',
    screenshot: HOTLINK_SCREENSHOT,
    reporter: '王工 (电气点检员)',
    assignee: '陈主管 (动力车间)',
    deviceCode: 'MTR-02-CORE',
    severityScore: 65,
    auditLogs: [
      { time: '2026-10-28 11:03', user: '王工', action: '巡检记录：红外测温热斑识别' },
      { time: '2026-10-28 11:20', user: '陈主管', action: '已派单至电机维保小组，当前处于降载观察中' },
    ],
  },
  {
    id: '#003',
    title: '控制柜指示灯异常',
    desc: '10kV 配电室 3 号高压进线柜储能指示灯频闪失灵，断路器储能机构信号微动开关可能接触不良。',
    priority: 'LOW',
    status: 'OPEN',
    scene: '配电室',
    pos: { x: -2.115, y: 0.942, z: 1.337 },
    createdAt: '2026-10-28 10:26',
    updatedAt: '2026-10-28 10:26',
    screenshot: HOTLINK_SCREENSHOT,
    reporter: '赵巡检',
    assignee: '待分派',
    deviceCode: 'SWGR-10KV-03',
    severityScore: 32,
    auditLogs: [
      { time: '2026-10-28 10:26', user: '赵巡检', action: '日常巡检登记' },
    ],
  },
  {
    id: '#004',
    title: '管道连接处松动',
    desc: '冷却水主供水管 DN250 拐弯处管卡支架膨胀螺栓脱落松动，流体流动引发管道低频共振。',
    priority: 'HIGH',
    status: 'RESOLVED',
    scene: '管道区',
    pos: { x: 5.663, y: 1.218, z: -4.891 },
    createdAt: '2026-10-27 16:45',
    updatedAt: '2026-10-28 09:30',
    screenshot: HOTLINK_SCREENSHOT,
    reporter: '刘工 (管道巡检班)',
    assignee: '孙工 (结构加固组)',
    deviceCode: 'PIPE-DN250-BRACKET',
    severityScore: 82,
    auditLogs: [
      { time: '2026-10-27 16:45', user: '刘工', action: '发现支架晃动脱落' },
      { time: '2026-10-28 08:30', user: '孙工', action: '进场焊接强化支撑板并重打地脚膨胀螺栓' },
      { time: '2026-10-28 09:30', user: '孙工', action: '复测振动在标准值内，标记已解决' },
    ],
  },
  {
    id: '#005',
    title: '地面积水',
    desc: '副厂房排污渠盖板边缘有含油凝结水积存，未及时导流至沉淀池，存在地面湿滑安全隐患。',
    priority: 'MEDIUM',
    status: 'OPEN',
    scene: '其他',
    pos: { x: -1.442, y: 0, z: -2.331 },
    createdAt: '2026-10-27 14:20',
    updatedAt: '2026-10-27 15:10',
    screenshot: HOTLINK_SCREENSHOT,
    reporter: '周巡检',
    assignee: '环安保障部',
    deviceCode: 'DRAIN-FLOOR-G04',
    severityScore: 48,
    auditLogs: [
      { time: '2026-10-27 14:20', user: '周巡检', action: '安全巡检登记隐患' },
      { time: '2026-10-27 15:10', user: '环安保障部', action: '已放置黄色防滑警示牌并通知清洁班组' },
    ],
  },
];

// Seed remaining items 6 to 56 to precisely hit:
// Total: 56
// Status: OPEN: 28, IN_PROGRESS: 14, RESOLVED: 14
// Priority: HIGH: 19, MEDIUM: 19, LOW: 18
// Scene: 泵房区: 15, 配电室: 13, 管道区: 14, 其他: 14

export function generateInitialIssues(): Issue[] {
  const result: Issue[] = [...baseIssues];

  // We already have:
  // Base 5 counts:
  // Status: OPEN: 3 (001, 003, 005), IN_PROGRESS: 1 (002), RESOLVED: 1 (004)
  // Needed: OPEN: 25, IN_PROGRESS: 13, RESOLVED: 13 => total 51
  // Priority: HIGH: 2 (001, 004), MEDIUM: 2 (002, 005), LOW: 1 (003)
  // Needed: HIGH: 17, MEDIUM: 17, LOW: 17 => total 51
  // Scene: 泵房区: 2 (001, 002), 配电室: 1 (003), 管道区: 1 (004), 其他: 1 (005)
  // Needed: 泵房区: 13, 配电室: 12, 管道区: 13, 其他: 13 => total 51

  const statuses: Issue['status'][] = [
    ...Array(25).fill('OPEN'),
    ...Array(13).fill('IN_PROGRESS'),
    ...Array(13).fill('RESOLVED'),
  ];

  const priorities: Issue['priority'][] = [
    ...Array(17).fill('HIGH'),
    ...Array(17).fill('MEDIUM'),
    ...Array(17).fill('LOW'),
  ];

  const scenes: Issue['scene'][] = [
    ...Array(13).fill('泵房区'),
    ...Array(12).fill('配电室'),
    ...Array(13).fill('管道区'),
    ...Array(13).fill('其他'),
  ];

  const sampleTitles: Record<string, string[]> = {
    泵房区: [
      '主循环离心泵轴承润滑油位偏低',
      '增压水泵进气口阻火阀卡阻',
      '泵体机械密封微量滴漏',
      '变频给水机组冷却风道积尘',
      '深水井潜水泵出口压力表指针抖动',
      '备用泵自启联锁回路校验异常',
      '隔振垫橡胶硬化龟裂',
      '电动球阀限位传感器信号漂移',
      '吸水池液位计超声波探头盲区受干扰',
      '污水提升泵叶轮缠绕异物告警',
      '回流泄压阀开启压力偏离整定值',
      '稳压气压罐隔膜疲劳预警',
      '机泵接地扁钢螺栓锈蚀',
    ],
    配电室: [
      '低压电容补偿柜接触器触头氧化',
      '变压器室内温湿度超出设定上限',
      '直流屏蓄电池内阻升高告警',
      '母线槽伸缩节红外发热点达 62℃',
      '配电室防小动物挡板密封条松脱',
      'UPS 不间断电源逆变器旁路指示灯闪烁',
      '进线隔离开关辅助触点接触不良',
      '电缆夹层烟感探测器巡检自检超期',
      '接地网接地电阻测试点标记模糊',
      '干式变压器温控箱风机常转不休',
      '避雷器放电计数器读数突增',
      '抽屉式出线柜二次插件对插松脱',
    ],
    管道区: [
      '蒸汽减压阀前后压力比异常',
      '压缩空气主管路接头漏气产生嘶声',
      '冷凝水回水管保温层局部破损',
      '工艺酸洗管线视镜玻璃起雾',
      '重力排水管立管检查口封闭不严',
      '氮气供气阀组压力调节阀膜片老化',
      '消防喷淋支管末端试水压力不足',
      '跨跨管道伸缩器位移量接近极值',
      '燃气泄漏探测报警仪传感器零点漂移',
      '循环冷却水管外壁防腐涂层脱落',
      '管网水锤消除器气囊充气压力不足',
      '法兰跨接防静电铜编织带断裂',
      '排污管盲板螺栓紧固力矩衰减',
    ],
    其他: [
      '厂区外围周界红外对射报警误报',
      '中央控制室大屏拼接缝亮度不均',
      '巡检机器人充电桩电极触片氧化',
      '安全通道逃生门电磁锁失电吸合延迟',
      '高空管廊巡检走道防滑格栅变形',
      '危废暂存间负压风机排风量减小',
      '室外消火栓扳手丢失及闷盖锈死',
      '工业交换机 24 口光纤跳线弯折过大',
      '洗眼器紧急冲淋水压低于标准值',
      '巡检路线 RFID 电子标签脱落',
      '车间屋面防雷避雷带支架脱焊',
      '雨水收集沉砂池浮渣堆积过厚',
      '防爆配电箱箱门防爆结合面油漆脱落',
    ],
  };

  for (let i = 6; i <= 56; i++) {
    const idx = i - 6;
    const scene = scenes[idx % scenes.length];
    const status = statuses[idx % statuses.length];
    const priority = priorities[idx % priorities.length];
    const titleList = sampleTitles[scene] || sampleTitles['其他'];
    const title = titleList[idx % titleList.length] || `设备检测预警 #${i}`;

    const x = Number(((idx * 1.73 - 12.5) % 24).toFixed(3));
    const y = Number(((idx * 0.42) % 3.2).toFixed(3));
    const z = Number(((idx * 1.31 - 6.8) % 15).toFixed(3));

    const day = 20 + (idx % 8);
    const hour = 8 + (idx % 10);
    const min = 10 + (idx * 3) % 49;
    const createdAt = `2026-10-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    const updatedAt = `2026-10-28 ${String(10 + (idx % 4)).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

    result.push({
      id: `#${String(i).padStart(3, '0')}`,
      title,
      desc: `数字孪生空间定位巡检发现此项设备工况偏差，编号序列号：UNITY-PT-${2026000 + i}，需巡检工程师现场核查确认。`,
      priority,
      status,
      scene,
      pos: { x, y, z },
      createdAt,
      updatedAt,
      screenshot: HOTLINK_SCREENSHOT,
      reporter: `巡检员 #${(i % 5) + 1}`,
      assignee: status === 'RESOLVED' ? `维保技师 #${(i % 4) + 1}` : (status === 'IN_PROGRESS' ? '处理小组A' : '待指派'),
      deviceCode: `DEV-${scene.slice(0, 2)}-${String(i).padStart(3, '0')}`,
      severityScore: priority === 'HIGH' ? 85 : priority === 'MEDIUM' ? 60 : 35,
      auditLogs: [
        { time: createdAt, user: `巡检员 #${(i % 5) + 1}`, action: '巡检上报隐患条目' },
      ],
    });
  }

  return result;
}
