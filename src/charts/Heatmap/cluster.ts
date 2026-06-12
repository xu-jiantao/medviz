export interface ClusterNode {
  id: string
  height: number
  left?: ClusterNode
  right?: ClusterNode
  leafIndex: number
  size: number
  y?: number // y-coordinate in dendrogram (leaf order index or average of children)
}

/** 层次聚类 UPGMA 算法实现 */
export function clusterItems(
  items: Array<{ id: string; name: string }>,
  getVector: (id: string) => Array<number | string | null>,
  isCategorical: boolean
): {
  orderedIds: string[]
  treeLines: Array<[number, number] | null>
  maxHeight: number
} {
  const n = items.length
  if (n < 2) {
    return { orderedIds: items.map((t) => t.id), treeLines: [], maxHeight: 0 }
  }

  // 1. 提取所有向量并计算初始叶子节点
  const vectors = items.map((it) => getVector(it.id))
  let clusters: ClusterNode[] = items.map((it, idx) => ({
    id: it.id,
    height: 0,
    leafIndex: idx,
    size: 1,
  }))

  // 距离计算函数
  const calculateDistance = (v1: Array<number | string | null>, v2: Array<number | string | null>): number => {
    let sum = 0
    let count = 0
    const len = Math.max(v1.length, v2.length)
    for (let i = 0; i < len; i++) {
      const a = v1[i]
      const b = v2[i]
      if (a == null || b == null || a === '' || b === '') continue
      count++
      if (isCategorical) {
        if (a !== b) sum += 1
      } else {
        const diff = Number(a) - Number(b)
        sum += diff * diff
      }
    }
    if (count === 0) return 0
    return isCategorical ? sum / count : Math.sqrt(sum / count)
  }

  // 2. 初始化距离矩阵 (N x N)
  // distMap[c1.id][c2.id] = distance
  const distMap: Record<string, Record<string, number>> = {}
  for (let i = 0; i < n; i++) {
    const idA = clusters[i].id
    distMap[idA] = {}
    for (let j = 0; j < n; j++) {
      const idB = clusters[j].id
      if (i === j) {
        distMap[idA][idB] = 0
      } else {
        distMap[idA][idB] = calculateDistance(vectors[i], vectors[j])
      }
    }
  }

  // 3. UPGMA 聚类迭代循环
  let clusterIdCounter = 0
  while (clusters.length > 1) {
    let minDist = Infinity
    let minI = 0
    let minJ = 1

    // 寻找最近的两个类
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const d = distMap[clusters[i].id][clusters[j].id]
        if (d < minDist) {
          minDist = d
          minI = i
          minJ = j
        }
      }
    }

    const cA = clusters[minI]
    const cB = clusters[minJ]

    // 融合为新类
    const newCluster: ClusterNode = {
      id: `cluster_${clusterIdCounter++}`,
      height: minDist / 2,
      left: cA,
      right: cB,
      leafIndex: cA.leafIndex,
      size: cA.size + cB.size,
    }

    // 更新新类与其它所有类的距离
    distMap[newCluster.id] = {}
    const remainingClusters = clusters.filter((_, idx) => idx !== minI && idx !== minJ)
    for (const cK of remainingClusters) {
      // UPGMA 距离公式: d(AUB, K) = (sizeA * d(A, K) + sizeB * d(B, K)) / (sizeA + sizeB)
      const dA = distMap[cA.id][cK.id]
      const dB = distMap[cB.id][cK.id]
      const dNewK = (cA.size * dA + cB.size * dB) / (cA.size + cB.size)
      distMap[newCluster.id][cK.id] = dNewK
      distMap[cK.id][newCluster.id] = dNewK
    }

    // 移出旧类，加入新类
    clusters = remainingClusters
    clusters.push(newCluster)
  }

  const root = clusters[0]
  const maxHeight = root.height || 0.1 // 避免高度为0导致绘图出错

  // 4. 深度优先遍历树，得到叶子节点排序
  const orderedIds: string[] = []
  const getLeafOrder = (node: ClusterNode) => {
    if (!node.left && !node.right) {
      orderedIds.push(items[node.leafIndex].id)
    } else {
      if (node.left) getLeafOrder(node.left)
      if (node.right) getLeafOrder(node.right)
    }
  }
  getLeafOrder(root)

  // 建立叶子节点 ID -> 叶子序号的映射 (y-坐标)
  const leafOrderMap = new Map<string, number>()
  orderedIds.forEach((id, idx) => {
    leafOrderMap.set(id, idx)
  })

  // 5. 递归计算每个树节点的 y 坐标并搜集画线路径点
  const treeLines: Array<[number, number] | null> = []

  const computeYAndLines = (node: ClusterNode): number => {
    if (!node.left && !node.right) {
      node.y = leafOrderMap.get(node.id)!
      return node.y
    }

    const yLeft = node.left ? computeYAndLines(node.left) : 0
    const yRight = node.right ? computeYAndLines(node.right) : 0
    node.y = (yLeft + yRight) / 2

    // 从子节点 A 和 B 连线到父节点 P (x轴是高度height, y轴是y坐标)
    const xLeft = node.left?.height ?? 0
    const xRight = node.right?.height ?? 0
    const xParent = node.height

    // 绘制 U 型分支：[xLeft, yLeft] -> [xParent, yLeft] -> [xParent, yRight] -> [xRight, yRight]
    treeLines.push([xLeft, yLeft])
    treeLines.push([xParent, yLeft])
    treeLines.push([xParent, yRight])
    treeLines.push([xRight, yRight])
    treeLines.push(null) // 断点

    return node.y
  }
  computeYAndLines(root)

  return { orderedIds, treeLines, maxHeight }
}
