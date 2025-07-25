
"use client";
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Edit, Trash2, Filter, Search, Loader2, AlertTriangle, CheckCircle, XCircle, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserRole } from '@/contexts/auth-context'; 
import { useAuth } from '@/contexts/auth-context'; // To potentially get current operator's code

interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  vehicleModel?: string;
  licensePlate?: string;
  status: 'Active' | 'Inactive' | 'Pending Approval' | 'Suspended';
  rating?: number;
  totalRides?: number;
  createdAt?: { _seconds: number; _nanoseconds: number } | null;
  role: UserRole; 
  operatorCode?: string; // Added for operator association
}

export default function OperatorManageDriversPage() {
  const { user: currentOperatorUser } = useAuth(); // Get the currently logged-in operator
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isAddDriverDialogOpen, setIsAddDriverDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursors, setPrevCursors] = useState<Array<string | null>>([]);

  const DRIVERS_PER_PAGE = 10;

  // For demo purposes, assume the logged-in operator's code.
  // In a real app, this would come from currentOperatorUser.operatorCode or similar.
  const currentOperatorCodeForDemo = currentOperatorUser?.operatorCode || currentOperatorUser?.customId || "OP001"; // Fallback if not set

  const fetchDrivers = useCallback(async (cursor?: string | null, direction: 'next' | 'prev' | 'filter' = 'filter') => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('limit', String(DRIVERS_PER_PAGE));
      if (cursor) {
        params.append('startAfter', cursor);
      }
      if (filterStatus !== "all") {
        params.append('status', filterStatus);
      }
      if (searchTerm.trim() !== "") {
        params.append('searchName', searchTerm.trim());
      }
      // TODO: In a real app, the API should automatically filter by the logged-in operator's ID.
      // For this prototype, we fetch all and then filter on client if needed, or rely on operatorCode for approval logic.
      
      const response = await fetch(`/api/operator/drivers?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch drivers: ${response.status}`);
      }
      const data = await response.json();
      
      const fetchedDrivers = (data.drivers || []).map((d: any) => ({
        ...d,
        status: d.status || 'Inactive' 
      }));
      setDrivers(fetchedDrivers);
      setNextCursor(data.nextCursor || null);

      if (direction === 'filter') {
        setCurrentPage(1);
        setPrevCursors([]);
      } else if (direction === 'next') {
        if (drivers.length > 0 && cursor) {
           setPrevCursors(prev => [...prev, drivers[0]?.id || null]);
        }
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(message);
      toast({ title: "Error Fetching Drivers", description: message, variant: "destructive" });
      setDrivers([]); 
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, searchTerm, toast, drivers]); 

  useEffect(() => {
    fetchDrivers(null, 'filter');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, searchTerm]); // fetchDrivers removed from deps to avoid loop, as it depends on `drivers` for prevCursor.


  const handleNextPage = () => {
    if (nextCursor) {
      setCurrentPage(p => p + 1);
      fetchDrivers(nextCursor, 'next');
    }
  };

  const handlePrevPage = () => {
    if (prevCursors.length > 0) {
      const lastPrevCursor = prevCursors[prevCursors.length - 1];
      setPrevCursors(prev => prev.slice(0, -1));
      setCurrentPage(p => Math.max(1, p - 1));
      fetchDrivers(lastPrevCursor, 'prev');
    } else if (currentPage > 1) { 
        setCurrentPage(1);
        fetchDrivers(null, 'filter');
    }
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleFilterChange = (value: string) => {
    setFilterStatus(value);
  };

  const handleAddDriverSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionLoading(prev => ({ ...prev, addDriver: true }));
    const formData = new FormData(event.currentTarget);
    const newDriverData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      vehicleModel: formData.get('vehicleModel') as string,
      licensePlate: formData.get('licensePlate') as string,
      status: 'Pending Approval', 
      role: 'driver' as UserRole,
      // For new drivers added BY an operator, their operatorCode would be the operator's own code.
      operatorCode: currentOperatorUser?.operatorCode || currentOperatorUser?.customId || undefined, 
    };

    try {
      console.log("Simulating add driver by operator:", newDriverData);
      // This should ideally be a POST to /api/operator/drivers (not /api/auth/register)
      // For now, we'll just simulate.
      // const response = await fetch('/api/auth/register', { // WRONG endpoint for OPERATOR adding driver
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({...newDriverData, password: "Password123!"}), // Mock password
      // });
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to add driver.');
      // }
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      
      toast({ title: "Driver Submitted (Mock)", description: `${newDriverData.name} added and is pending approval under operator ${newDriverData.operatorCode}.`});
      setIsAddDriverDialogOpen(false);
      (event.target as HTMLFormElement).reset();
      fetchDrivers(null, 'filter'); 
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error adding driver.";
        toast({ title: "Add Driver Failed", description: message, variant: "destructive"});
    } finally {
        setActionLoading(prev => ({ ...prev, addDriver: false }));
    }
  };
  
  const handleDriverStatusUpdate = async (driverId: string, newStatus: Driver['status'], reason?: string) => {
    setActionLoading(prev => ({ ...prev, [driverId]: true }));
    try {
        const payload: any = { status: newStatus };
        if (newStatus === 'Suspended' && reason) {
            payload.statusReason = reason;
        }

        const response = await fetch(`/api/operator/drivers/${driverId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to update driver status to ${newStatus}.`);
        }
        const updatedDriverData = await response.json();
        
        setDrivers(prevDrivers => prevDrivers.map(d => d.id === driverId ? { ...d, status: updatedDriverData.driver.status } : d));
        toast({ title: "Driver Status Updated", description: `Driver ${updatedDriverData.driver.name || driverId} status set to ${newStatus}.`});
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error during status update.";
        toast({ title: "Status Update Failed", description: message, variant: "destructive" });
    } finally {
        setActionLoading(prev => ({ ...prev, [driverId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle className="text-3xl font-headline flex items-center gap-2">
              <Users className="w-8 h-8 text-primary" /> Manage Drivers
            </CardTitle>
            <CardDescription>Onboard, view, and manage your fleet of drivers. (Demo Operator: {currentOperatorCodeForDemo})</CardDescription>
          </div>
          <Dialog open={isAddDriverDialogOpen} onOpenChange={setIsAddDriverDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground mt-2 md:mt-0">
                <UserPlus className="mr-2 h-4 w-4" /> Add New Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Driver</DialogTitle>
                <DialogDescription>
                  Fill in the details to onboard a new driver. They will be set to 'Pending Approval' under your operator code: {currentOperatorCodeForDemo}.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddDriverSubmit} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" name="name" className="col-span-3" required disabled={actionLoading['addDriver']} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input id="email" name="email" type="email" className="col-span-3" required disabled={actionLoading['addDriver']} />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">Phone</Label>
                  <Input id="phone" name="phone" type="tel" className="col-span-3" disabled={actionLoading['addDriver']} />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="vehicleModel" className="text-right">Vehicle</Label>
                  <Input id="vehicleModel" name="vehicleModel" className="col-span-3" disabled={actionLoading['addDriver']} />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="licensePlate" className="text-right">License</Label>
                  <Input id="licensePlate" name="licensePlate" className="col-span-3" disabled={actionLoading['addDriver']} />
                </div>
                {/* Operator Code is implicitly the current operator's code */}
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline" disabled={actionLoading['addDriver']}>Cancel</Button></DialogClose>
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={actionLoading['addDriver']}>
                    {actionLoading['addDriver'] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Driver
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Search by driver name..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full md:max-w-xs"
                />
            </div>
            <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-muted-foreground" />
                <Select value={filterStatus} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent>
           {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}
          {error && !isLoading && (
            <div className="text-center py-10 text-destructive">
              <AlertTriangle className="mx-auto h-12 w-12 mb-2" />
              <p className="font-semibold">Error loading drivers:</p>
              <p>{error}</p>
              <Button onClick={() => fetchDrivers(null, 'filter')} variant="outline" className="mt-4">Try Again</Button>
            </div>
          )}
          {!isLoading && !error && drivers.length === 0 && (
             <p className="text-center text-muted-foreground py-8">No drivers match your criteria.</p>
          )}
          {!isLoading && !error && drivers.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Operator Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>
                        <div>{driver.email}</div>
                        <div className="text-xs text-muted-foreground">{driver.phone || 'N/A'}</div>
                      </TableCell>
                      <TableCell>{driver.operatorCode || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          driver.status === 'Active' ? 'default' :
                          driver.status === 'Pending Approval' ? 'secondary' :
                          driver.status === 'Suspended' ? 'destructive' :
                          'outline' 
                        }
                        className={
                            driver.status === 'Active' ? 'bg-green-500/80 text-green-950 hover:bg-green-500/70' :
                            driver.status === 'Pending Approval' ? 'bg-yellow-400/80 text-yellow-900 hover:bg-yellow-400/70' :
                            driver.status === 'Suspended' ? 'bg-red-600 text-white hover:bg-red-700' : 
                            'border-slate-500 text-slate-500 hover:bg-slate-500/10'
                        }
                        >
                          {driver.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                        {actionLoading[driver.id] ? (
                            <Loader2 className="h-5 w-5 animate-spin inline-block" />
                        ) : (
                            <>
                                {driver.status === 'Pending Approval' && driver.operatorCode === currentOperatorCodeForDemo && (
                                    <Button variant="outline" size="sm" className="h-8 border-green-500 text-green-500 hover:bg-green-500 hover:text-white" title="Approve Driver" onClick={() => handleDriverStatusUpdate(driver.id, 'Active')}>
                                        <CheckCircle className="h-4 w-4"/> <span className="ml-1 hidden sm:inline">Approve</span>
                                    </Button>
                                )}
                                {driver.status === 'Active' && (
                                    <Button variant="outline" size="sm" className="h-8 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white" title="Suspend Driver" onClick={() => {
                                        const reason = prompt("Reason for suspension (optional):");
                                        handleDriverStatusUpdate(driver.id, 'Suspended', reason || undefined);
                                    }}>
                                        <ShieldAlert className="h-4 w-4"/> <span className="ml-1 hidden sm:inline">Suspend</span>
                                    </Button>
                                )}
                                {(driver.status === 'Inactive' || driver.status === 'Suspended') && (
                                    <Button variant="outline" size="sm" className="h-8 border-sky-500 text-sky-500 hover:bg-sky-500 hover:text-white" title="Activate Driver" onClick={() => handleDriverStatusUpdate(driver.id, 'Active')}>
                                        <UserPlus className="h-4 w-4"/> <span className="ml-1 hidden sm:inline">Activate</span>
                                    </Button>
                                )}
                                {/* 
                                <Button variant="outline" size="icon" className="h-8 w-8" title="Edit Driver (Placeholder)">
                                    <Edit className="h-4 w-4" />
                                </Button>
                                */}
                            </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1 && prevCursors.length === 0 || isLoading}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {currentPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!nextCursor || isLoading}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
