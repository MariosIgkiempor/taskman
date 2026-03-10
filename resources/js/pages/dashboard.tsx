import { Head, Link } from '@inertiajs/react';
import { ArrowRight, CalendarDays, CheckCircle2, ListTodo } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { index as tasksIndex } from '@/routes/tasks';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Welcome back
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Here's an overview of your workspace.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-card p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                                <ListTodo className="size-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Tasks
                                </p>
                                <p className="text-lg font-bold tracking-tight">
                                    Manage your backlog
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl bg-card p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-chart-2/10">
                                <CalendarDays className="size-4 text-chart-2" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Schedule
                                </p>
                                <p className="text-lg font-bold tracking-tight">
                                    Plan your week
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl bg-card p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-chart-5/10">
                                <CheckCircle2 className="size-4 text-chart-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Progress
                                </p>
                                <p className="text-lg font-bold tracking-tight">
                                    Track completion
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <Link
                    href={tasksIndex()}
                    className="group flex items-center gap-2 self-start rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                    Go to Tasks
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>

                <div className="flex flex-1 items-center justify-center rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground/50">
                        More features coming soon
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
