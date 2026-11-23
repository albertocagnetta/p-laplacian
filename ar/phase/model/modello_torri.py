"""Export the two AR phase towers at p=2, with geometry and a lookup table."""
import json
from pathlib import Path

import numpy as np
from scipy.integrate import quad, solve_ivp
from scipy.optimize import brentq

A_PLUS, A_MINUS = 1.0, 2.0
NU = A_MINUS / A_PLUS
MU = A_PLUS / (A_PLUS + A_MINUS)
GAMMAS = (0.5, 3.0)
N_ARC = 56


def lower_limit(gamma):
    if gamma == 3:
        return 0.0
    e = -gamma / (1 + gamma)
    numerator = quad(lambda t: (1 + NU*t)**e, 0, 1,
                     weight="alg", wvar=(0, -0.5))[0]
    return NU * numerator * (0.5 + e)


def energy_drop(beta, q):
    return (1.0 if beta == 0 else -np.expm1(q*np.log(beta))) / q


def times(log_beta, gamma):
    q = 1 + gamma
    speed = np.sqrt(2*A_PLUS*(1-MU)*(-np.expm1(q*log_beta))/q)
    tau = quad(lambda v: (1-q*v*v/(2*A_PLUS))**(-gamma/q)
               / A_PLUS, 0, speed, epsabs=1e-12)[0]
    # v = sqrt(2*a_-/q) * beta**(q/2) * sinh(z)
    z_max = np.arcsinh(speed*np.sqrt(q/(2*A_MINUS))*np.exp(-q*log_beta/2))
    integral = quad(lambda z: np.cosh(z)**(2/q-1), 0, z_max,
                    epsabs=1e-12, epsrel=2e-11)[0]
    sigma = np.sqrt(2/(A_MINUS*q))*np.exp((1-q/2)*log_beta)*integral
    return tau, sigma


def beta_at(lam, gamma):
    lo = lower_limit(gamma)
    if lam == lo:
        return 0.0
    if lam == NU:
        return 1.0
    if not lo < lam < NU:
        raise ValueError("Level is outside the closed display interval.")

    def error(log_beta):
        tau, sigma = times(log_beta, gamma)
        return tau/sigma - lam

    root = brentq(error, -100, -1e-9, xtol=2e-12)
    return float(np.exp(root))


def arcs(beta, gamma):
    q = 1 + gamma
    speed = np.sqrt(2*A_PLUS*(1-MU)*energy_drop(beta,q))
    v = speed*(1-np.cos(np.linspace(0, np.pi, N_ARC)))/2
    w = v[::-1]
    plus = np.column_stack(((1-q*v*v/(2*A_PLUS))**(1/q), -v))
    minus = np.column_stack(((beta**q+q*w*w/(2*A_MINUS))**(1/q), -w))
    return plus, minus


def verify():
    # Check the window endpoints independently of the sampling grid.
    np.testing.assert_allclose(lower_limit(.5), .5118967269863489, atol=1e-12)
    assert lower_limit(3) == 0
    for gamma in GAMMAS:
        log_betas = np.linspace(-24, -.001, 120)
        ratios = [tau/sigma for tau,sigma in (times(x,gamma) for x in log_betas)]
        assert np.all(np.diff(ratios) > 0)
        z = arcs(0, gamma)[0][-1]
        q = 1 + gamma
        np.testing.assert_allclose(z,[MU**(1/q),-np.sqrt(2*A_PLUS*(1-MU)/q)])
        # Below x_Z, the exhausted second arc still has negative velocity.
        s = 0.9*z[0]
        assert (1+1/NU)*s**q-1/NU < 0
        np.testing.assert_allclose(arcs(1,gamma)[1], np.tile([1,0], (N_ARC,1)))
    for gamma,lam,expected in [(0.5,1,.095710),(3,1,2**(-.5)),(3,.25,.309233)]:
        beta = beta_at(lam,gamma)
        np.testing.assert_allclose(beta,expected,atol=1e-6,rtol=0)
        plus,minus = arcs(beta,gamma)
        np.testing.assert_allclose(plus[-1],minus[0],atol=1e-12)
        tau,sigma = times(np.log(beta),gamma)
        for a,start,end,dt in [(A_PLUS,plus[0],plus[-1],tau),
                                (-A_MINUS,minus[0],minus[-1],sigma)]:
            sol = solve_ivp(lambda _,xy:[xy[1],-a*xy[0]**gamma],(0,dt),start,
                            rtol=2e-11,atol=2e-13)
            assert sol.success
            np.testing.assert_allclose(sol.y[:,-1],end,atol=2e-9)
        print(f"gamma={gamma:g}, lambda={lam:g}, beta={beta:.9f}, tau_n={tau:.9f}")


def export(path):
    towers = []
    for gamma in GAMMAS:
        lo = lower_limit(gamma)
        layers = []
        for i, lam in enumerate(np.linspace(lo, NU, 29)):
            lam = float(lam)
            beta = beta_at(lam, gamma)
            plus,minus = arcs(beta,gamma)
            layers.append(dict(lam=lam, xiT=beta, plus=plus.round(9).tolist(),
                               minus=minus.round(9).tolist(),
                               kind="limit" if i in (0,28) else "orbit"))
        # The lookup is denser near the limiting levels. Only the static
        # display layers have uniform spacing in lambda.
        levels = lo+(NU-lo)*np.sin(np.linspace(0,np.pi/2,401))**2
        levels[0],levels[-1] = lo,NU
        betas = [beta_at(float(lam),gamma) for lam in levels]
        assert np.all(np.diff(levels)>0) and np.all(np.diff(betas)>0)
        mid = (levels[:-1]+levels[1:])/2
        error = max(abs((lambda t: t[0]/t[1])(times(np.log((a+b)/2),gamma))-lam)
                    for a,b,lam in zip(betas,betas[1:],mid))
        assert error < 1e-4, error
        print(f"gamma={gamma:g}: midpoint lookup ratio error <= {error:.3g}")
        towers.append(dict(gamma=gamma, openWindow=[lo,NU], layers=layers,
                           lookup=list(zip(levels.tolist(),betas))))
    data = dict(schemaVersion=1,p=2,aPlus=A_PLUS,aMinus=A_MINUS,nu=NU,
                heightScale="linear",arcPoints=N_ARC,towers=towers)
    path.write_text(json.dumps(data,separators=(",",":"),allow_nan=False)+"\n")


if __name__ == "__main__":
    verify()
    export(Path("torri.json"))
    print("OK — torri.json")
