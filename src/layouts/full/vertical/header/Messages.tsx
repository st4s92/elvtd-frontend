'use client';

import { Icon } from '@iconify/react';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import { Link } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'src/components/ui/dropdown-menu';
import { Badge } from 'src/components/ui/badge';
import { Button } from 'src/components/ui/button';
import { useEffect, useState, useCallback } from 'react';
import axiosClient from 'src/lib/axios';

const Messages = () => {
  const [jobs, setJobs] = useState<Record<string, any>[]>([]);
  const [open, setOpen] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const res: any = await axiosClient.get('/logs/paginated', {
        params: {
          PerPage: 10,
          Page: 1,
          Level: 'Error',
        },
      });
      const data = res.data?.data || [];
      setJobs(data);
    } catch (error) {
      console.error('Failed to fetch notification jobs', error);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 15000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const getBadgeVariant = (level: string) => {
    if (level === 'Error') return 'destructive';
    if (level === 'Warning') return 'warning';
    return 'secondary';
  };

  const getIconForLevel = (level: string) => {
    if (level === 'Error') return 'solar:danger-triangle-line-duotone';
    if (level === 'Warning') return 'solar:info-circle-line-duotone';
    return 'solar:check-circle-line-duotone';
  };

  const getColorForLevel = (level: string) => {
    if (level === 'Error') return 'text-error bg-lighterror dark:bg-lighterror';
    if (level === 'Warning') return 'text-warning bg-lightwarning dark:bg-lightwarning';
    return 'text-secondary bg-lightsecondary dark:bg-lightsecondary';
  };

  return (
    <div className="relative group/menu px-4 sm:px-15 ">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <div className="relative">
            <span className="relative after:absolute after:w-10 after:h-10 after:rounded-full hover:text-primary after:-top-1/2 hover:after:bg-lightprimary text-link dark:text-darklink rounded-full flex justify-center items-center cursor-pointer group-hover/menu:after:bg-lightprimary group-hover/menu:!text-primary">
              <Icon icon="tabler:bell-ringing" height={20} />
            </span>
            {jobs.length > 0 && (
              <span className="rounded-full absolute -end-[6px] -top-[5px] text-[10px] h-4 w-4 bg-error text-white flex justify-center items-center font-bold">
                {jobs.length > 9 ? '9+' : jobs.length}
              </span>
            )}
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-screen sm:w-[360px] py-6 rounded-sm border border-ld"
        >
          <div className="flex items-center px-6 justify-between">
            <h3 className="mb-0 text-lg font-semibold text-ld">Jobs</h3>
            {jobs.length > 0 && (
              <Badge variant={'destructive'}>{jobs.length} errors</Badge>
            )}
          </div>

          <SimpleBar className="max-h-80 mt-3">
            {jobs.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                No error jobs found
              </div>
            ) : (
              jobs.map((job, index) => {
                const level = job.level || 'Info';
                const date = new Date(job.createdAt);
                const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                return (
                  <DropdownMenuItem
                    className="px-6 py-3 flex items-start gap-3 bg-hover group/link w-full cursor-pointer"
                    key={job.id || index}
                  >
                    <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${getColorForLevel(level)}`}>
                      <Icon icon={getIconForLevel(level)} height={18} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant={getBadgeVariant(level)} className="text-[10px] px-1.5 py-0">
                          {level}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{timeStr}</span>
                      </div>
                      <h5 className="text-sm truncate group-hover/link:text-primary">
                        {job.category}: {job.action}
                      </h5>
                      <span className="text-xs block truncate text-darklink">
                        {job.message || '-'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                );
              })
            )}
          </SimpleBar>

          <div className="pt-5 px-6">
            <Link to="/dashboard/jobs">
              <Button variant={'outline'} className="w-full" onClick={() => setOpen(false)}>
                See All Notifications
              </Button>
            </Link>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default Messages;
