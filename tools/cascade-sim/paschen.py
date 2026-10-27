# Stratified column: heaviest gas at the bottom, lightest at the top (the heterosphere order), pressure falling one golden step per layer.
import math
PHI = (1 + 5 ** .5) / 2
# Paschen constants A [1/(cm Torr)], B [V/(cm Torr)] (standard textbook values); secondary emission gamma
GAS = [('krypton', 17, 240, '#d6ccff'), ('CO2', 20, 466, '#cfe6ff'), ('argon', 12, 180, '#9c6bff'), ('air', 15, 365, '#c58ad9'),
       ('nitrogen', 12, 342, '#e98bc4'), ('neon', 4, 100, '#ff5a2a'), ('helium', 3, 34, '#ffb4a2'), ('hydrogen', 5, 130, '#ff4fa3')]
GAMMA = 0.01; D_CM = 1.0
def paschen(A, B, pd): return B * pd / (math.log(A * pd) - math.log(math.log(1 + 1 / GAMMA)))
def column(p_ground_torr=760.0):
    out = []
    for k, (g, A, B, col) in enumerate(GAS):
        p = p_ground_torr * PHI ** -k
        out.append((k + 1, g, p, paschen(A, B, p * D_CM), col))
    return out
if __name__ == '__main__':
    c = column(); v1 = c[0][3]
    print('layer gas        pressure  strike kV  strike/layer1  ladder share (phi^-2(k-1))')
    for k, g, p, v, col in c: print(f'{k:5d} {g:10s} {p:8.1f}   {v/1000:7.2f}    {v/v1:9.3f}      {PHI**(-2*(k-1)):.3f}')
    # weather: Perth pressure swing ~ 1000..1030 hPa = 750..773 Torr
    lo, hi = column(750.0), column(773.0)
    print('strike change across a 750->773 Torr swing, per layer (%):', [round(100 * (h[3] / l[3] - 1), 2) for l, h in zip(lo, hi)])
