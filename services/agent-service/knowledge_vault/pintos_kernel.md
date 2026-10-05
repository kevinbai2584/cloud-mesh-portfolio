# Pintos Operating System Kernel

## Thread Scheduling and Priority Donation
In the Pintos OS (CS162 at UC Berkeley), multiple threads frequently compete for synchronized resources. Without priority donation, a low-priority thread holding a lock needed by a high-priority thread causes priority inversion. We implemented recursive priority donation across semaphores, locks, and condition variables, ensuring the lock holder temporarily inherits the maximum priority of all waiting threads. Additionally, we designed a Multi-Level Feedback Queue (MLFQ) scheduler with 64 priority queues, recalculating priority, nice values, and recent_cpu every 4 ticks based on exponential moving averages to maximize CPU throughput.

## User Process Isolation and Syscall Layer
Constructed the user memory protection and system call dispatching layer. Handled syscalls including exec, wait, fork, open, read, and write. Enforced rigorous user virtual pointer boundary checks and page verification before accessing memory to prevent user processes from tampering with kernel space. Synchronized process termination and exit statuses using parent-child synchronization structures.

## Demand-Paged Virtual Memory Architecture
Architected a virtual memory subsystem implementing demand paging. Designed a Supplementary Page Table (SPT) to manage page locations (frame, file system, or swap partition). Implemented a Clock (Second-Chance) page eviction algorithm for physical frame allocation and engineered swap slot bitmapped tracking for memory-mapped files (mmap) and anonymous pages.