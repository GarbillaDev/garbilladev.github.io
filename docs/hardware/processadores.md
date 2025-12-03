# Processadores (CPU) — história, arquitetura e métricas

## O que é a CPU
A CPU (Central Processing Unit) é a unidade que executa instruções do programa. Tradicionalmente é responsável por controle e cálculo.

## Arquiteturas: CISC x RISC
- **CISC (Complex Instruction Set Computer)**: muitas instruções complexas (ex.: x86).
- **RISC (Reduced Instruction Set Computer)**: instruções simples, pipeline mais eficiente (ex.: ARM).

## Componentes e conceitos importantes
- **Frequência (GHz)**: ciclos por segundo; não é o único indicador de desempenho.
- **IPC (Instructions Per Cycle)**: quantidade média de instruções executadas por ciclo; IPC × frequência = throughput.
- **Núcleos / threads**: múltiplos núcleos para execução paralela; hyperthreading cria threads lógicas.
- **Cache (L1, L2, L3)**: memórias rápidas próximas ao núcleo que reduzem latência.
- **TDP (Thermal Design Power)**: calor máximo esperado; importante para refrigeração.
- **Litografia (nm)**: processo de fabricação; números menores = transistores menores (mais densidade).
- **Pipeline, Branch Prediction**: técnicas para manter a CPU ocupada e reduzir stalls.

## Evolução e exemplos
- Mainframes → microprocessadores (Intel 4004) → CPUs modernas (multi-core, complexos pipelines).
- Exemplos: Intel x86 (CISC), AMD Ryzen (x86 moderno), ARM (móvel e servidor emergente).

## Métricas para comparar CPUs
- Benchmarks sintéticos (SPEC), desempenho por watt, throughput em aplicações reais (games, servidores, ciência).
- Para trabalho final: compare arquitetura, números de núcleos, caches e litografia entre gerações (ex.: Intel vs AMD, ou ARM big.LITTLE).

## Notas adicionais
- Overclocking e undervolting: técnicas para flexibilizar desempenho; considerações térmicas.
- Virtualização: instruções e suporte de hardware para VMs (Intel VT-x, AMD-V).
