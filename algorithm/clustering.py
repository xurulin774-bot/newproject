# -*- coding: utf-8 -*-
"""KMeans 聚类（纯 numpy 实现，后端与 EDA 共享）。

实现 k-means++ 初始化 + Lloyd 迭代的标准 KMeans，不引入 scikit-learn 依赖，
保持天气系统"零重型依赖、可独立部署"的架构约束。
"""

from __future__ import annotations

import numpy as np


def kmeans(data, k: int, iterations: int = 100, seed: int = 42):
    """对 (n, m) 数据做 KMeans 聚类。

    返回 (labels, centers, inertia)：
    - labels: (n,) 每个样本的簇编号 0..k-1
    - centers: (k, m) 簇中心（标准化空间）
    - inertia: 所有样本到其簇中心的距离平方和（越小越紧凑）
    """
    X = np.asarray(data, dtype=float)
    n = X.shape[0]
    k = max(1, min(int(k), n))
    rng = np.random.default_rng(seed)

    # ---- k-means++ 初始化：首个中心随机，之后按距离平方加权采样 ----
    centers = [X[rng.integers(n)]]
    for _ in range(1, k):
        d2 = np.min(((X[:, None, :] - np.asarray(centers)[None, :, :]) ** 2).sum(axis=2), axis=1)
        total = d2.sum()
        probs = d2 / total if total > 0 else np.full(n, 1.0 / n)
        centers.append(X[rng.choice(n, p=probs)])
    centers = np.asarray(centers, dtype=float)

    # ---- Lloyd 迭代：分配 -> 更新中心，直到不再变化 ----
    labels = np.full(n, -1, dtype=int)
    for _ in range(iterations):
        distances = ((X[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
        new_labels = distances.argmin(axis=1)
        if (new_labels == labels).all():
            break
        labels = new_labels
        for j in range(k):
            mask = labels == j
            if mask.any():
                centers[j] = X[mask].mean(axis=0)
    inertia = float(((X - centers[labels]) ** 2).sum())
    return labels, centers, inertia
