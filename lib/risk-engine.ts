export type StudentStats = {
    lastActiveAt: Date | null
    accuracy: number
    mockTestPassRate: number
}

export function computeRiskLevel(
    stats: StudentStats
): 'at-risk' | 'normal' | 'high-performer' {
    const now = new Date()

    // Check activity recency
    const activeWithin7Days = stats.lastActiveAt
        ? (now.getTime() - stats.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24) <= 7
        : false

    const inactiveFor14Days = stats.lastActiveAt
        ? (now.getTime() - stats.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24) > 14
        : true

    // High Performer:
    // - Accuracy > 75%
    // - Mock Test Pass Rate > 70%
    // - Active within last 7 days
    if (stats.accuracy > 75 && stats.mockTestPassRate > 70 && activeWithin7Days) {
        return 'high-performer'
    }

    // At-Risk:
    // - No MCQ activity in last 14 days
    // - OR Mock test pass rate < 30% (but arguably a 0% pass rate should trigger unless we check attempts?)
    // Actually, we should probably check if they HAVE mock test attempts before failing them for < 30%.
    // For now, adhering strictly to requirements:
    if (inactiveFor14Days || stats.mockTestPassRate < 30) {
        return 'at-risk'
    }

    return 'normal'
}
